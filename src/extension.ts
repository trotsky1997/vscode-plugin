"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";
import * as API from "./API";
import { activateCPP } from "./cppExtension";
import { activateGo } from "./goExtension";
import { localize, localizeMessages } from "./i18n";
import { activateJava } from "./javaExtension";
import { getInstance } from "./lang/commons";
import { LangUtil } from "./lang/langUtil";
import log from "./logger";
import { activatePhp } from "./phpExtension";
import Preference from "./Preference";
import { activatePython } from "./pythonExtension";
import { AiXSearchSerializer, doSearch } from "./search";
import { Syncer } from "./Syncer";
import { activateTypeScript } from "./typescriptExtension";
import { SafeStringUtil } from "./utils/SafeStringUtil";

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

export const myID = "nnthink.aixcoder";
const myPackageJSON = vscode.extensions.getExtension(myID).packageJSON;
export const myVersion = myPackageJSON.version;

export function compareVersion(v1: any, v2: any) {
    if (typeof v1 !== "string") { return false; }
    if (typeof v2 !== "string") { return false; }
    v1 = v1.split(".");
    v2 = v2.split(".");
    const k = Math.min(v1.length, v2.length);
    for (let i = 0; i < k; ++i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) { return 1; }
        if (v1[i] < v2[i]) { return -1; }
    }
    return v1.length === v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
}

const shownMessages = new Set();
export async function showInformationMessageOnce(message: string, ...items: string[]): Promise<string | undefined> {
    if (!shownMessages.has(message)) {
        shownMessages.add(message);
        return showInformationMessage(message, ...items);
    }
}

export async function showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
    if (!Preference.context.globalState.get("hide:" + message)) {
        const localizedItems = [];
        for (const item of items) {
            localizedItems.push(localize(item));
        }
        const select = await vscode.window.showInformationMessage(localize(message), ...localizedItems, localize("nevershowagain"));
        if (select === localize("nevershowagain")) {
            Preference.context.globalState.update("hide:" + message, true);
            return;
        }
        return select;
    }
}

export async function showWarningMessage(message: string, ...items: string[]): Promise<string | undefined> {
    if (!Preference.context.globalState.get("hide:" + message)) {
        const localizedItems = [];
        for (const item of items) {
            localizedItems.push(localize(item));
        }
        const select = await vscode.window.showWarningMessage(localize(message), ...localizedItems, localize("nevershowagain"));
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
    filters?: string[];
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
    longResults?: AiXCompletionItem[];
}

export interface SortResultEx extends SortResult {
    ext: string;
    fetchTime: number;
    current: string;
}

let lastText = "";
let lastPromise = null;
let lastFetchTime = 0;
let lastQueryUUID = 0;

function fetch(langUtil: LangUtil, ext: string, text: string, remainingText: string, fileID: string) {
    if (lastText === text && lastPromise != null) {
        return { body: lastPromise, queryUUID: lastQueryUUID, remote: false };
    } else {
        log("> send request for ext=" + ext + " and text=..." + JSON.stringify(text.substr(Math.max(0, text.length - 20))));
        lastText = text;
        lastFetchTime = new Date().getTime();
        const queryUUID = Math.floor(Math.random() * 10000);
        lastQueryUUID = queryUUID;
        lastPromise = API.predict(langUtil, text, ext, remainingText, lastQueryUUID, fileID).catch((err) => {
            log(err);
            if (lastQueryUUID === queryUUID) {
                lastQueryUUID = null;
                lastPromise = null;
            }
        });
        return { body: lastPromise, queryUUID, fetchTime: lastFetchTime };
    }
}

// tslint:disable no-bitwise
function hashCode(s: string) {
    let hash = 0; let i: number; let chr: number;
    if (s.length === 0) { return hash; }
    for (i = 0; i < s.length; i++) {
        chr = s.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}

export function getReqText(document: vscode.TextDocument, position: vscode.Position, lang: string) {
    const langUtil = getInstance(lang);
    const offset = document.offsetAt(position);
    const lineEnd = document.lineAt(position).range.end;
    const lineEndOffset = document.offsetAt(lineEnd);
    const text = document.getText();   // 获取编辑器上面已有的文字
    const partialText = text.substring(0, offset);
    if (!langUtil.shouldPredict(partialText)) {
        return {
            text: null,
            remainingText: null,
            offsetID: 0,
        };
    }
    return {
        text: partialText,
        remainingText: text.substring(offset, lineEndOffset),
        offsetID: hashCode(partialText),
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
function formatResData(results: PredictResult, langUtil: LangUtil, document: vscode.TextDocument, ext: string, text: string, starDisplay = STAR_DISPLAY.LEFT): AiXCompletionItem[] {
    const star = vscode.workspace.getConfiguration().get("aiXcoder.symbol");
    const r: AiXCompletionItem[] = [];
    const command: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.insert",
        arguments: [ext, "primary", langUtil, document],
    };
    const minCompletionTokensCount = Preference.getParam("controllerMode") ? 0 : 1;
    const sortL2S = Preference.getLongResultCutsLong2Short();
    const unique = new Set();
    for (const result of results.data) {
        if (result.tokens.length > minCompletionTokensCount) {
            if (result.tokens.length === 2 && result.tokens[1] === "(" && result.tokens[0].match(/[a-zA-Z0-9_$]+/)) {
                continue;
            }
            const mergedTokens = [result.current + result.tokens[0], ...result.tokens.slice(1)];
            const filterTextMergedTokens = [text.substring(text.length - result.current.length) + result.tokens[0], ...result.tokens.slice(1)];
            let title = langUtil.render(mergedTokens, 0);
            let rendered = title.replace(/(?=\$)/g, "\\");
            if (result.r_completion && result.r_completion.length > 0) {
                const template = langUtil.getTemplateForTag(result.r_completion[0]);
                const rCompletionText = langUtil.render(result.r_completion.slice(1), 0);
                // tslint:disable-next-line: no-invalid-template-strings
                rendered += template + rCompletionText;
                title += (template + rCompletionText).replace(/\$\{0:([^}]+)\}/, "$1").replace(/\$\{0\}/, "...");
            }
            const label = starDisplay === STAR_DISPLAY.LEFT ? star + title : (starDisplay === STAR_DISPLAY.RIGHT ? title + star : title);
            if (!unique.has(label)) {
                const z: AiXCompletionItem = {
                    label,
                    filterText: langUtil.render(filterTextMergedTokens, 0),
                    insertText: new vscode.SnippetString(rendered),
                    kind: vscode.CompletionItemKind.Snippet,
                    sortText: Preference.getLongResultRankSortText() + "." + (sortL2S ? 1 - title.length / 100 : title.length / 100),
                    aixPrimary: true,
                };
                z.command = { ...command, arguments: command.arguments.concat([result, z]) };
                r.push(z);
                unique.add(label);
            }
        }
    }
    return r;
}

export function formatSortData(results: SortResult | null, langUtil: LangUtil, document: vscode.TextDocument, ext: string, current: string) {
    if (results == null) { return []; }
    const star = vscode.workspace.getConfiguration().get("aiXcoder.symbol");
    const r: vscode.CompletionItem[] = [];
    const command: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.insert",
        arguments: [ext, "secondary", langUtil, document],
    };
    let insertedRank = 1;
    for (const single of results.list) {
        if (single.word.match(/^<.+>$/)) {
            continue;
        }
        const z: AiXCompletionItem = {
            label: star + single.word,
            filterText: current + single.word.substring(current.length),
            insertText: single.word,
            kind: vscode.CompletionItemKind.Variable,
            sortText: "0." + insertedRank++,
        };
        z.command = { ...command, arguments: command.arguments.concat([single, z]) };
        r.push(z);
    }
    return r;
}

export async function fetchResults2(text: string, remainingText: string, fileName: string, ext: string, lang: string, document: vscode.TextDocument, starDisplay = STAR_DISPLAY.LEFT): Promise<{
    longResults: AiXCompletionItem[],
    sortResults: SortResult,
    fetchTime: number,
    current: string,
}> {
    let fetchBody: string = null;
    let queryUUID: number;
    let fetchTime: number;
    const langUtil = getInstance(lang);
    if (Preference.shouldTrigger(lastModifedTime, document)) {
        const fetched = fetch(langUtil, ext, text, remainingText, fileName);
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
        let current = "";
        for (const lr of predictResults.data) {
            if (lr.current) {
                current = lr.current;
                break;
            }
        }
        let strLabels = formatResData(predictResults, langUtil, document, ext, text, starDisplay);
        // log("predict result:");
        // log(strLabels);
        const results = {
            queryUUID: queryUUID.toString(),
            list: predictResults.data.length > 0 ? predictResults.data[0].sort || [] : [],
        };
        const unique = new Set();
        for (const sortResult of results.list) {
            unique.add(sortResult[1]);
        }
        const newStrLabels = [];
        for (const strLabel of strLabels) {
            if (!unique.has(strLabel.filterText)) {
                newStrLabels.push(strLabel);
            }
        }
        strLabels = newStrLabels;
        // log("mina result:");
        const mappedResults = {
            ...results,
            list: results.list.map(([prob, word, options]) => {
                options = options || {};
                return { prob, word: langUtil.renderToken(word, options), options };
            }),
        };
        return {
            longResults: strLabels,
            sortResults: mappedResults,
            fetchTime,
            current,
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
            current: "",
        };
    }
}

export async function fetchResults<T>(document: vscode.TextDocument, position: vscode.Position, ext: string, lang: string, syncer?: Syncer<T>, starDisplay: STAR_DISPLAY = STAR_DISPLAY.LEFT) {
    const startTime = Date.now();
    const { text, remainingText, offsetID } = getReqText(document, position, lang);
    if (text == null) {
        return {
            longResults: [],
            sortResults: {
                queryUUID: "",
                list: [],
                longResults: [],
            },
            offsetID,
            fetchTime: startTime,
            current: "",
        };
    }
    if (syncer) { syncer.notify(offsetID); }
    const { longResults, sortResults, fetchTime, current } = await fetchResults2(text, remainingText, document.fileName, ext, lang, document, starDisplay);
    log("< fetch took " + (Date.now() - startTime) + "ms");
    return {
        longResults,
        sortResults,
        offsetID,
        fetchTime,
        current: text.substring(text.length - current.length),
    };
}

export function sendPredictTelemetryShort(ext: string, fetchTime: number, sortResult: SortResult) {
    if (fetchTime && fetchTime === lastFetchTime && sortResult.list.length > 0) {
        API.sendTelemetry(ext, API.TelemetryType.ShortShow);
    }
}

export function sendPredictTelemetryLong(ext: string, fetchTime: number, longResults: AiXCompletionItem[]) {
    if (fetchTime && fetchTime === lastFetchTime && longResults.length > 0 && longResults[0].aixPrimary) {
        API.sendTelemetry(ext, API.TelemetryType.LongShow);
    }
}

export const onDeactivateHandlers = [];
const actualIDEPaths: string[] = [];
const actualHooks = [];
let locateIDEShown = false;
export async function JSHooker(aixHookedString: string, distjsPath: string, extension: vscode.Extension<any>, reloadMsg: string, failMsg: string, hookCallback: (distjs: string) => string) {
    let aixHooked = false;
    let distjs: string;
    distjs = await fs.promises.readFile(distjsPath, "utf-8");
    aixHooked = distjs.startsWith(aixHookedString);
    if (aixHooked) {
        return true;
    }

    if (distjsPath.indexOf("/private/var/folders") >= 0) {
        // mac temporary path, need to find actual "Visual Studio Code.app" path
        const relPath = distjsPath.substring(distjsPath.indexOf(".app/") + ".app/".length);
        async function actualHook() {
            for (const idePath of actualIDEPaths) {
                const realDistJsPath = path.join(idePath, relPath);
                await JSHooker(aixHookedString, realDistJsPath, extension, reloadMsg, failMsg, hookCallback);
            }
        }
        if (actualIDEPaths.length === 0) {
            try {
                // try aiXcoder installer paths.json
                const pathsJson = fs.readFileSync(path.join(process.env.HOME, "Library", "Application Support", "aiXcoder", "installer", "paths.json"), "utf-8");
                const pathsObj: object = JSON.parse(pathsJson);
                let found = false;
                for (const idePath in pathsObj) {
                    if (pathsObj.hasOwnProperty(idePath)) {
                        if (pathsObj[idePath].idetype === "vscode" && pathsObj[idePath].idePath.indexOf("/private/var/folders") < 0) {
                            found = true;
                            actualIDEPaths.push(pathsObj[idePath].idePath);
                        }
                    }
                }
                if (!found) {
                    throw new Error("not found");
                }
                await actualHook();
            } catch (e) {
                // on any error, prompt to choose the location
                actualHooks.push(actualHook);
                if (!locateIDEShown) {
                    locateIDEShown = true;
                    vscode.window.showWarningMessage(localize("locateIDE"), localize("locate")).then(async (select) => {
                        locateIDEShown = false;
                        if (select === localize("locate")) {
                            const idePaths = await vscode.window.showOpenDialog({
                                canSelectFiles: true,
                                canSelectFolders: false,
                                canSelectMany: false,
                                filters: {
                                    "VS Code": ["app"],
                                },
                                openLabel: localize("locateDialog"),
                            });
                            if (idePaths) {
                                actualIDEPaths.push(...idePaths.map((_) => _.fsPath));
                                for (const theActualHook of actualHooks) {
                                    await theActualHook();
                                }
                            }
                        }
                    });
                }
            }
        }
        return false;
    }

    log(`Hooking ${distjsPath}`);

    try {
        // restore backup file
        await fs.promises.copyFile(distjsPath + ".bak", distjsPath);
        distjs = await fs.promises.readFile(distjsPath, "utf-8");
    } catch (e) {
        if (e.code === "ENOENT") {
            try {
                await fs.promises.copyFile(distjsPath, distjsPath + ".bak");
            } catch (error) {
                if (error.code === "EPERM") {
                    // create backup file
                    vscode.window.showErrorMessage(localize("needAdmin"));
                } else {
                    log(e);
                }
                return false;
            }
        }
    }
    try {
        distjs = aixHookedString + distjs;
        distjs = hookCallback(distjs);
        try {
            await fs.promises.writeFile(distjsPath, distjs, "utf-8");
        } catch (e) {
            console.log(e);
            const errMsg = e.message;
            if (errMsg.indexOf("operation not permitted") >= 0 && errMsg.indexOf("EPERM") >= 0) {
                vscode.window.showWarningMessage(localize("hookFailPerm"));
            } else {
                vscode.window.showWarningMessage(localize("hookFailOther", errMsg));
            }
            return false;
        }
        log(`${distjsPath} hooked`);
        if (extension.isActive) {
            vscode.window.showWarningMessage(localize(reloadMsg), localize("reload")).then((select) => {
                if (select === localize("reload")) {
                    vscode.commands.executeCommand("workbench.action.reloadWindow");
                }
            });
        } else {
            return true;
        }
    } catch (e) {
        console.log(e);
        if (e instanceof SafeStringUtil.NotFoundError) {
            await vscode.window.showWarningMessage(localize(failMsg));
        }
    }
    return false;
}

export function mergeSortResult(l: vscode.CompletionItem[], sortResults: SortResultEx, document: vscode.TextDocument, lang: string, ext: string, starDisplay = STAR_DISPLAY.LEFT) {
    if (sortResults == null) { return; }
    const star = vscode.workspace.getConfiguration().get("aiXcoder.symbol");
    if (l.length === 0) {
        l.push(...formatSortData(sortResults, getInstance(lang), document, ext, sortResults.current));
        return;
    }
    const telemetryCommand: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.insert",
        arguments: [ext, "secondary", getInstance(lang), document],
    };
    const sortResultsMap = {};
    const sortResultCompletions = {};
    let insertedRank = 1;
    for (const single of sortResults.list) {
        if (single.word.match(/^<.+>$/)) {
            continue;
        }
        sortResultsMap[single.word] = [single, insertedRank++];
    }

    for (const systemCompletion of l) {
        if (systemCompletion.sortText == null) {
            systemCompletion.sortText = systemCompletion.filterText;
        }
        let realInsertText = systemCompletion.label || systemCompletion.insertText;
        if (typeof (realInsertText) !== "string") {
            realInsertText = realInsertText.value;
        }
        if (realInsertText.startsWith("★ ")) {
            realInsertText = realInsertText.substr(2);
        }
        const m = realInsertText.match("^.+?\\b");
        if (m && sortResultsMap.hasOwnProperty(m[0])) {
            const single = sortResultsMap[m[0]][0];
            if (systemCompletion.label.indexOf(" - ") >= 0 && single.options && single.options.filters && single.options.filters.length > 0) {
                for (let i = 0; i < single.options.filters.length; i++) {
                    let filter = single.options.filters[i];
                    if (filter.endsWith("." + single.word)) {
                        filter = filter.substring(0, filter.length - single.word.length - 1);
                    }
                    if (systemCompletion.label.indexOf(filter) >= 0) {
                        if (sortResultCompletions[single.word] == null || i < sortResultCompletions[single.word][0]) {
                            sortResultCompletions[single.word] = [i, systemCompletion];
                        }
                        break;
                    }
                }
            }
            if (sortResultCompletions[single.word] == null) {
                sortResultCompletions[single.word] = [999, systemCompletion];
            }
        }
    }

    for (const singleWord in sortResultsMap) {
        if (sortResultsMap.hasOwnProperty(singleWord)) {
            const [single, rank] = sortResultsMap[singleWord];
            const rankText = rank.toString().padStart(3, "0");
            if (sortResultCompletions.hasOwnProperty(singleWord)) {
                const bestSystemCompletion = sortResultCompletions[singleWord][1];
                let insertText = bestSystemCompletion.insertText || bestSystemCompletion.label;
                if (typeof (insertText) !== "string") {
                    insertText = insertText.value;
                }
                bestSystemCompletion.filterText = bestSystemCompletion.filterText || bestSystemCompletion.label;
                bestSystemCompletion.filterText = sortResults.current + bestSystemCompletion.filterText.substring(sortResults.current.length);
                bestSystemCompletion.insertText = bestSystemCompletion.insertText || bestSystemCompletion.label;
                bestSystemCompletion.label = starDisplay === STAR_DISPLAY.LEFT ? star + bestSystemCompletion.label : (starDisplay === STAR_DISPLAY.RIGHT ? bestSystemCompletion.label + star : bestSystemCompletion.label);
                bestSystemCompletion.sortText = ".0." + rankText;
                bestSystemCompletion.command = { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) };
                if (bestSystemCompletion.kind === vscode.CompletionItemKind.Function && insertText.indexOf("(") === -1) {
                    bestSystemCompletion.insertText = new vscode.SnippetString(insertText).appendText("(").appendTabstop().appendText(")");
                }
            } else {
                if (single.options && single.options.forced) {
                    l.push({
                        label: starDisplay === STAR_DISPLAY.LEFT ? star + single.word : (starDisplay === STAR_DISPLAY.RIGHT ? single.word + star : single.word),
                        filterText: single.word,
                        insertText: single.word,
                        sortText: ".0." + rankText,
                        command: { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) },
                        kind: vscode.CompletionItemKind.Variable,
                    });
                }
            }
        }
    }
    if (sortResults.longResults) {
        l.push(...sortResults.longResults);
    }
    for (const item of l) {
        if (item.command && item.command.arguments && item.command.arguments.length > 5) {
            item.command.arguments[5] = { ...item.command.arguments[5] };
            delete item.command.arguments[5].command;
        }
    }
}

interface ModelQuickPickItem extends vscode.QuickPickItem {
    lang: string;
}
const lastModifedTime: { [uri: string]: number } = {};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    log("AiX: aiXcoder activating");

    if (os.platform() === "win32" && compareVersion(os.release(), "10") < 0) {
        const star = vscode.workspace.getConfiguration().get("aiXcoder.symbol");
        if (star === myPackageJSON.contributes.configuration.properties["aiXcoder.symbol"].default) {
            // Emoji ⭐ does not display under < win7
            vscode.workspace.getConfiguration().set("aiXcoder.symbol", "★");
        }
    }

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
    context.subscriptions.push(vscode.commands.registerCommand("aiXcoder.insert", (ext: string, subtype: string, langUtil: LangUtil, document: vscode.TextDocument, single: SinglePredictResult | SingleWordCompletion, completionItem: AiXCompletionItem) => {
        try {
            if (subtype === "primary") {
                const tokenLen = completionItem.insertText.toString().split(/\b/g).filter((s) => s.trim().length > 0).length;
                const charLen = completionItem.insertText.toString().length;
                API.sendTelemetry(ext, API.TelemetryType.LongUse, tokenLen, charLen);
            } else if (subtype === "secondary") {
                API.sendTelemetry(ext, API.TelemetryType.ShortUse, 1, (single as SingleWordCompletion).word.length);
            }
        } catch (e) {
            log(e);
        }
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

    const commandHandler = async () => {
        const langs = { cpp: "C++/C", python: "Python", java: "Java", php: "Php", javascript: "JavaScript", typescript: "TypeScript", go: "Go" };
        const models = await API.getModels();
        const availableLangs = new Set<string>();
        for (const ext of models) {
            const lang = ext.substring(ext.indexOf("(") + 1, ext.length - 1).toLowerCase();
            availableLangs.add(lang);
        }
        const selectedLang = await vscode.window.showQuickPick((async () => {
            const displays: ModelQuickPickItem[] = [];
            for (const lang of availableLangs) {
                const configKey = "aiXcoder.model." + lang;
                const configValue = vscode.workspace.getConfiguration().get(configKey);
                displays.push({
                    label: `${langs[lang]}: ${configValue}`,
                    description: `aiXcoder model used for ${langs[lang]}`,
                    lang,
                });
            }
            return displays;
        })());

        if (selectedLang) {
            const selectedModel = await vscode.window.showQuickPick((async () => {
                const filtered = models.filter((model) => model.toLowerCase().endsWith(`(${selectedLang.lang})`));
                return filtered;
            })());
            if (selectedModel != null) {
                vscode.workspace.getConfiguration().update("aiXcoder.model." + selectedLang.lang, selectedModel);
                vscode.window.showInformationMessage(util.format(localize("model.switch"), langs[selectedLang.lang], selectedModel));
            }
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand("aixcoder.switchModel", commandHandler));

    vscode.window.registerWebviewPanelSerializer("aixsearch", new AiXSearchSerializer());
    context.subscriptions.push(vscode.commands.registerCommand("aiXcoder.search", (uri) => {
        doSearch(context, uri);
    }));
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    if (msintellicode) {
        showInformationMessage("msintellicode.enabled");
    }
    try {
        const aixHooks: {
            [lang: string]: void | {
                aixHook: (ll: vscode.CompletionList | vscode.CompletionItem[], ...args: any) => Promise<vscode.CompletionList | vscode.CompletionItem[]>,
            },
        } = {
            python: await activatePython(context),
            java: await activateJava(context),
            cpp: await activateCPP(context),
            php: await activatePhp(context),
            typescript: await activateTypeScript(context),
            go: await activateGo(context),
        };
        log("AiX: aiXcoder activated");
        return {
            async aixhook(lang: string, ll: vscode.CompletionList | vscode.CompletionItem[] | Promise<vscode.CompletionList | vscode.CompletionItem[]>, ...args: any): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
                let funcName = "aixHook";
                const sep = lang.indexOf("-");
                if (sep >= 0) {
                    lang = lang.substr(0, sep);
                    funcName = lang.substr(sep + 1);
                }
                const hookObj = aixHooks[lang];
                if (hookObj && hookObj.aixHook) {
                    ll = await ll;
                    return hookObj[funcName](ll, ...args);
                }
                return ll;
            },
        };
    } catch (e) {
        log("AiX: aiXcoder activation failed, reason:");
        log(e);
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
    for (const onDeactivateHandler of onDeactivateHandlers) {
        onDeactivateHandler();
    }
}
