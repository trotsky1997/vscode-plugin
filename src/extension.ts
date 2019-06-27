"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as util from "util";
import * as vscode from "vscode";
import * as API from "./API";
import { activateCPP } from "./cppExtension";
import { localize, localizeMessages } from "./i18n";
import { activateJava } from "./javaExtension";
import { getInstance } from "./lang/commons";
import { LangUtil } from "./lang/langUtil";
import log from "./logger";
import Preference from "./Preference";
import { activatePython } from "./pythonExtension";
import { SafeStringUtil } from "./utils/SafeStringUtil";

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

const myPackageJSON = vscode.extensions.getExtension("nnthink.aixcoder").packageJSON;
export const myVersion = myPackageJSON.version;

export async function showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
    if (!Preference.context.globalState.get("hide:" + message)) {
        const select = await vscode.window.showInformationMessage(localize(message), ...items.map(localize), localize("nevershowagain"));
        if (select === localize("nevershowagain")) {
            Preference.context.globalState.update("hide:" + message, true);
            return;
        }
        return select;
    }
}

export interface Rescue {
    type: string;
    value: string;
}

export interface CompletionOptions {
    rescues?: Rescue[];
    forced?: boolean;
}

interface PredictResult {
    data: SinglePredictResult[];
}

interface SinglePredictResult {
    tokens: string[];
    prob?: number;
    current?: string;
    rescues?: Rescue[];
    r_completion?: string[];
    familiarity?: number;
    type?: "rnn" | "ngram";
    sort?: Array<[number, string, CompletionOptions?]>;
}

export interface SingleWordCompletion {
    word: string;
    prob: number;
    options?: CompletionOptions;
}

export interface SortResult {
    queryUUID: string;
    list: SingleWordCompletion[];
}

let lastText = "";
let lastPromise = null;
let lastFetchTime = 0;
let lastQueryUUID = 0;

function fetch(ext: string, text: string, remainingText: string, fileID: string) {
    if (lastText === text && lastPromise != null) {
        return { body: lastPromise, queryUUID: lastQueryUUID, remote: false };
    } else {
        log("> send request for ext=" + ext + " and text=..." + JSON.stringify(text.substr(Math.max(0, text.length - 20))));
        lastText = text;
        lastFetchTime = new Date().getTime();
        const queryUUID = Math.floor(Math.random() * 10000);
        lastQueryUUID = queryUUID;
        lastPromise = API.predict(text, ext, remainingText, lastQueryUUID, fileID).catch((err) => {
            log(err);
            if (lastQueryUUID === queryUUID) {
                lastQueryUUID = null;
                lastPromise = null;
            }
        });
        return { body: lastPromise, queryUUID, fetchTime: lastFetchTime };
    }
}

export function getReqText(document: vscode.TextDocument, position: vscode.Position) {
    const offset = document.offsetAt(position);
    const lineEnd = document.lineAt(position).range.end;
    const lineEndOffset = document.offsetAt(lineEnd);
    const text = document.getText();   // 获取编辑器上面已有的文字
    return {
        text: text.substring(0, offset),
        remainingText: text.substring(offset, lineEndOffset),
        offsetID: (position.line + 1) * (position.character + 1),
    };
}

class AiXCompletionItem extends vscode.CompletionItem {
    public aixPrimary?: boolean;
    constructor(label: string, kind?: vscode.CompletionItemKind) {
        super(label, kind);
    }
}

export enum STAR_DISPLAY {
    LEFT,
    RIGHT,
    NONE,
}

// 处理返回的值，最终变成放入提示框的内容
function formatResData(results: PredictResult, langUtil: LangUtil, document: vscode.TextDocument, starDisplay = STAR_DISPLAY.LEFT): AiXCompletionItem[] {
    const r: AiXCompletionItem[] = [];
    const command: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.insert",
        arguments: ["use", "primary", langUtil, document],
    };
    const minCompletionTokensCount = Preference.getParam("controllerMode") ? 0 : 1;
    for (const result of results.data) {
        if (result.tokens.length > minCompletionTokensCount) {
            if (result.tokens.length === 2 && result.tokens[1] === "(" && result.tokens[0].match(/[a-zA-Z0-9_$]+/)) {
                continue;
            }
            const mergedTokens = [result.current + result.tokens[0], ...result.tokens.slice(1)];
            let title = langUtil.render(mergedTokens, 0);
            let rendered = title.replace(/(?=\$\{[^}]+\})/g, "\\");
            if (result.r_completion && result.r_completion.length > 0) {
                // tslint:disable-next-line: no-invalid-template-strings
                rendered += "${0}" + result.r_completion.join("");
                title += "..." + result.r_completion.join("");
            }
            r.push({
                label: starDisplay === STAR_DISPLAY.LEFT ? "⭐" + title : (starDisplay === STAR_DISPLAY.RIGHT ? title + "⭐" : title),
                filterText: title,
                insertText: new vscode.SnippetString(rendered),
                kind: vscode.CompletionItemKind.Snippet,
                sortText: Preference.getLongResultRankSortText(),
                command: { ...command, arguments: command.arguments.concat([result]) },
                aixPrimary: true,
            });
        }
    }
    return r;
}

export function formatSortData(results: SortResult | null, langUtil: LangUtil, document: vscode.TextDocument) {
    if (results == null) { return []; }
    const r: vscode.CompletionItem[] = [];
    const command: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.insert",
        arguments: ["use", "secondary", langUtil, document],
    };
    let insertedRank = 1;
    for (const single of results.list) {
        if (single.word.match(/^<.+>$/)) {
            continue;
        }
        r.push({
            label: "⭐" + single.word,
            filterText: single.word,
            insertText: single.word,
            kind: vscode.CompletionItemKind.Variable,
            sortText: "0." + insertedRank++,
            command: { ...command, arguments: command.arguments.concat([single]) },
        });
    }
    return r;
}

export async function fetchResults2(text: string, remainingText: string, fileName: string, ext: string, lang: string, document: vscode.TextDocument, starDisplay = STAR_DISPLAY.LEFT): Promise<{
    longResults: AiXCompletionItem[],
    sortResults: SortResult,
    fetchTime: number,
}> {
    let fetchBody: string = null;
    let queryUUID: number;
    let fetchTime: number;
    if (Preference.shouldTrigger(lastModifedTime, document)) {
        const fetched = fetch(ext, text, remainingText, fileName);
        fetchBody = await fetched.body;
        queryUUID = fetched.queryUUID;
        fetchTime = fetched.fetchTime;
        log(fetchBody);
    }
    if (fetchBody == null) {
        fetchBody = "{\"data\":[]}";
        queryUUID = 0;
        fetchTime = 0;
    }
    try {
        let predictResults: PredictResult = fetchBody && typeof fetchBody === "string" ? JSON.parse(fetchBody) : fetchBody;
        if (predictResults.data == null) {
            predictResults = { data: predictResults as any };
        }
        const strLabels = formatResData(predictResults, getInstance(lang), document, starDisplay);
        // log("predict result:");
        // log(strLabels);
        const results = {
            queryUUID: queryUUID.toString(),
            list: predictResults.data.length > 0 ? predictResults.data[0].sort || [] : [],
        };
        // log("mina result:");
        const mappedResults = {
            ...results,
            list: results.list.map(([prob, word, options]) => ({ prob, word, options })),
        };
        return {
            longResults: strLabels,
            sortResults: mappedResults,
            fetchTime,
        };
    } catch (e) {
        if (!(e instanceof Error)) {
            e = new Error(e);
        }
        e.message += "\ndetail: " + fetchBody;
        log(e);
        return {
            longResults: [],
            sortResults: {
                queryUUID: queryUUID.toString(),
                list: [],
            },
            fetchTime,
        };
    }
}

export async function fetchResults(document: vscode.TextDocument, position: vscode.Position, ext: string, lang: string, starDisplay: STAR_DISPLAY = STAR_DISPLAY.LEFT) {
    const startTime = Date.now();
    const { text, remainingText, offsetID } = getReqText(document, position);
    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, lang, document, starDisplay);
    log("< fetch took " + (Date.now() - startTime) + "ms");
    return {
        longResults,
        sortResults,
        offsetID,
        fetchTime,
    };
}

export function sendPredictTelemetry(fetchTime: number, longResults: AiXCompletionItem[]) {
    if (fetchTime) {
        if (fetchTime === lastFetchTime && longResults.length > 0 && longResults[0].aixPrimary) {
            API.sendTelemetry("show");
        } else {
            API.sendTelemetry("nul");
        }
    }
}

export const onDeactivateHandlers = [];

export async function JSHooker(aixHookedString: string, distjsPath: string, extension: vscode.Extension<any>, reloadMsg: string, failMsg: string, hookCallback: (distjs: string) => string) {
    let aixHooked = false;
    let distjs: string;
    distjs = await fs.promises.readFile(distjsPath, "utf-8");
    aixHooked = distjs.startsWith(aixHookedString);
    if (!aixHooked) {
        log(`Hooking ${distjsPath}`);
        try {
            // restore backup file
            await fs.promises.copyFile(distjsPath + ".bak", distjsPath);
            distjs = await fs.promises.readFile(distjsPath, "utf-8");
        } catch (e) {
            // create backup file
            await fs.promises.copyFile(distjsPath, distjsPath + ".bak");
        }
        try {
            const oldSize = distjs.length;
            distjs = aixHookedString + distjs;
            distjs = hookCallback(distjs);
            if (distjs.length > oldSize) {
                await fs.promises.writeFile(distjsPath, distjs, "utf-8");
                if (extension.isActive) {
                    const select = await vscode.window.showWarningMessage(localize(reloadMsg), localize("reload"));
                    if (select === localize("reload")) {
                        vscode.commands.executeCommand("workbench.action.reloadWindow");
                    }
                }
                log(`${distjsPath} hooked`);
            } else {
                await vscode.window.showWarningMessage(localize(failMsg));
            }
        } catch (e) {
            console.log(e);
            if (e instanceof SafeStringUtil.NotFoundError) {
                await vscode.window.showWarningMessage(localize(failMsg));
            }
        }
    }
}

export function mergeSortResult(l: vscode.CompletionItem[], sortResults: SortResult, document: vscode.TextDocument, starDisplay = STAR_DISPLAY.LEFT) {
    const telemetryCommand: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.insert",
        arguments: ["use", "secondary", getInstance("java"), document],
    };
    let insertedRank = 1;
    for (const single of sortResults.list) {
        if (single.word.match(/^<.+>$/)) {
            continue;
        }
        let found = false;
        for (const systemCompletion of l) {
            if (systemCompletion.sortText == null) {
                systemCompletion.sortText = systemCompletion.filterText;
            }
            let insertText = systemCompletion.insertText;
            if (insertText == null) {
                insertText = systemCompletion.label;
            }
            if (typeof (insertText) !== "string") {
                insertText = insertText.value;
            }
            if (insertText.match("^" + escapeRegExp(single.word) + "\\b") && !systemCompletion.label.startsWith("⭐")) {
                systemCompletion.filterText = systemCompletion.filterText || systemCompletion.label;
                systemCompletion.label = starDisplay === STAR_DISPLAY.LEFT ? "⭐" + systemCompletion.label : (starDisplay === STAR_DISPLAY.RIGHT ? systemCompletion.label + "⭐" : systemCompletion.label);
                systemCompletion.sortText = "0." + insertedRank++;
                systemCompletion.command = { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) };
                if (systemCompletion.kind === vscode.CompletionItemKind.Function && insertText.indexOf("(") === -1) {
                    systemCompletion.insertText = new vscode.SnippetString(insertText).appendText("(").appendTabstop().appendText(")");
                }
                found = true;
            }
        }
        if (!found && single.options && single.options.forced) {
            l.push({
                label: starDisplay === STAR_DISPLAY.LEFT ? "⭐" + single.word : (starDisplay === STAR_DISPLAY.RIGHT ? single.word + "⭐" : single.word),
                filterText: single.word,
                insertText: single.word,
                sortText: "0." + insertedRank++,
                command: { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) },
                kind: vscode.CompletionItemKind.Variable,
            });
        }
    }
}

const lastModifedTime: { [uri: string]: number } = {};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    log("AiX: aiXcoder activating");

    const endpoint = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
    if (!endpoint) {
        vscode.window.showWarningMessage(localize("aiXcoder.endpoint.empty"), localize("openSetting")).then((selected) => {
            if (selected === localize("openSetting")) {
                vscode.commands.executeCommand("workbench.action.openSettings", "aiXcoder: Endpoint");
            }
        });
    }

    Preference.init(context);
    API.checkUpdate();
    const askedTelemetry = context.globalState.get("aiXcoder.askedTelemetry");
    if (!askedTelemetry) {
        context.globalState.update("aiXcoder.askedTelemetry", true);
        const enableTelemetry = vscode.workspace.getConfiguration().get("aiXcoder.enableTelemetry");
        const enableTelemetryMsg = enableTelemetry ? localize("enabled") : localize("disabled");
        vscode.window.showInformationMessage(util.format(localize("aiXcoder.askedTelemetry"), enableTelemetryMsg), localize("aiXcoder.askedTelemetryOK"), localize("aiXcoder.askedTelemetryNo")).then((selected) => {
            if (selected === localize("aiXcoder.askedTelemetryNo")) {
                vscode.workspace.getConfiguration().update("aiXcoder.enableTelemetry", false);
            }
        });
    }
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.uri.scheme === "file" || document.uri.scheme === "untitled") {
            lastModifedTime[document.uri.toJSON()] = Date.now();
        }
    }));
    context.subscriptions.push(vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.uri.scheme === "file" || event.document.uri.scheme === "untitled") {
            lastModifedTime[event.document.uri.toJSON()] = Date.now();
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("aiXcoder.insert", (type: string, subtype: string, langUtil: LangUtil, document: vscode.TextDocument, single: SinglePredictResult | SingleWordCompletion) => {
        API.sendTelemetry(type, subtype);
        if (typeof langUtil === "string") {
            langUtil = getInstance(langUtil);
        }
        if ((single as SinglePredictResult).rescues) {
            langUtil.rescue(document, (single as SinglePredictResult).rescues);
        } else if ((single as SingleWordCompletion).options && (single as SingleWordCompletion).options.rescues) {
            langUtil.rescue(document, (single as SingleWordCompletion).options.rescues);
        }
    }));
    context.subscriptions.push(vscode.commands.registerCommand("aiXcoder.resetMessage", () => {
        for (const message of Object.keys(localizeMessages)) {
            Preference.context.globalState.update("hide:" + message, false);
        }
        showInformationMessage("msgreset");
    }));

    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    if (msintellicode) {
        showInformationMessage("msintellicode.enabled");
    }
    await activatePython(context);
    await activateJava(context);
    await activateCPP(context);
    log("AiX: aiXcoder activated");
    return {};
}

// this method is called when your extension is deactivated
export function deactivate() {
    for (const onDeactivateHandler of onDeactivateHandlers) {
        onDeactivateHandler();
    }
}
