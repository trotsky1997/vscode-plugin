"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as path from "path";
import * as util from "util";
import * as vscode from "vscode";
import * as API from "./API";
import { getInstance } from "./lang/commons";
import { LangUtil } from "./lang/langUtil";
import log from "./logger";
import Preference from "./Preference";
import { SafeStringUtil } from "./utils/SafeStringUtil";

function escapeRegExp(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
}

const localizeMessages: { [key: string]: { en: string, "zh-cn": string } } = {
    "mspythonExtension.install": {
        "en": "AiXCoder: Microsoft Python extension is not installed or enabled. Please install Microsoft Python extension for the best experience.",
        "zh-cn": "AiXCoder: Microsoft Python 插件没有安装或启用。请安装 Microsoft Python 插件以获得最佳体验。",
    },
    "assembly.load.fail": {
        "en": "AiXCoder: assembly load failed, reason: ",
        "zh-cn": "AiXCoder: 程序集加载失败，原因：",
    },
    "reload": {
        "en": "Reload",
        "zh-cn": "重新加载",
    },
    "mspythonExtension.activate.fail": {
        "en": "AiXCoder: Microsoft Python extension activate failed, reason: ",
        "zh-cn": "AiXCoder: Microsoft Python 插件启动失败，原因：",
    },
    "action.install": {
        "en": "Install...",
        "zh-cn": "安装...",
    },
    "redhatjavaExtension.activate.fail": {
        "en": "AiXCoder: Language Support for Java(TM) by Red Hat activate failed, reason: ",
        "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 启动失败，原因：",
    },
    "redhatjavaExtension.install": {
        "en": "AiXCoder: Language Support for Java(TM) by Red Hat is not installed or enabled. Please install Language Support for Java(TM) by Red Hat for the best experience.",
        "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 插件没有安装或启用。请安装 Language Support for Java(TM) by Red Hat 插件以获得最佳体验。",
    },
    "mscpptoolsExtension.install": {
        "en": "AiXCoder: C/C++ Extension is not installed or enabled. Please install C/C++ Extension for the best experience.",
        "zh-cn": "AiXCoder: C/C++ 插件没有安装或启用。请安装 C/C++ 插件以获得最佳体验。",
    },
    "newVersion": {
        "en": "A new aiXcoder version is available: %s, update now?",
        "zh-cn": "发现一个新的aiXcoder版本：%s，现在更新？",
    },
    "download": {
        "en": "Update",
        "zh-cn": "更新",
    },
    "ignoreThisVersion": {
        "en": "Ignore this version",
        "zh-cn": "忽略这个版本",
    },
    "aiXcoder.askedTelemetry": {
        "en": "AiXCoder will send anonymous usage data to improve user experience. You can disable it in settings by turning off aiXcoder.enableTelemetry. (Current: %s)",
        "zh-cn": "AiXCoder会发送匿名使用数据以提升用户体验。您可以在设置中关闭aiXcoder.enableTelemetry项来停止此行为。(当前：%s)",
    },
    "openSetting": {
        "en": "Open Settings...",
        "zh-cn": "打开设置...",
    },
    "aiXcoder.askedTelemetryOK": {
        "en": "OK",
        "zh-cn": "知道了",
    },
    "aiXcoder.askedTelemetryNo": {
        "en": "Don't send my usage data",
        "zh-cn": "不要发送我的使用数据",
    },
    "cpp.reload": {
        "en": "AiXCoder requires a reload to integrate with C/C++ extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 C/C++ 插件集成。",
    },
    "cpp.fail": {
        "en": "C/C++ Extension integration failed. Please ensure you have latest version of aiXcoder and C/C++ Extension installed.",
        "zh-cn": "C/C++ 插件集成失败。请确保您安装了最新版本的aiXcoder插件以及C/C++插件。",
    },
    "aiXcoder.endpoint.empty": {
        "en": "AiXCoder server endpoint is not set.",
        "zh-cn": "AiXCoder服务器端口未设置。",
    },
    "enabled": {
        "en": "Enabled",
        "zh-cn": "已启用",
    },
    "disabled": {
        "en": "Disabled",
        "zh-cn": "已关闭",
    },
    "python.fail": {
        "en": "Python Extension integration failed. Please ensure you have latest version of aiXcoder and Python Extension installed.",
        "zh-cn": "Python 插件集成失败。请确保您安装了最新版本的aiXcoder插件以及Python插件。",
    },
    "python.reload": {
        "en": "AiXCoder requires a reload to integrate with Python extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 Python 插件集成。",
    },
    "msintellicode.enabled": {
        "en": "AiXCoder is in compability mode because MS IntelliCode Extension is installed. Results from aiXcoder will not be shown when IntelliCode results are avaialble.",
        "zh-cn": "AiXCoder正处于兼容模式因为微软IntelliCode插件已被安装。在IntelliCode插件提供推荐结果时AiXCoder的推荐结果将被隐藏。",
    },
    "nevershowagain": {
        "en": "Don't show again",
        "zh-cn": "不再显示",
    },
    "mspythonExtension.install": {
        "en": "AiXCoder: Microsoft Python extension is not installed or enabled. Please install Microsoft Python extension for the best experience.",
        "zh-cn": "AiXCoder: Microsoft Python 插件没有安装或启用。请安装 Microsoft Python 插件以获得最佳体验。",
    },
    "assembly.load.fail": {
        "en": "AiXCoder: assembly load failed, reason: ",
        "zh-cn": "AiXCoder: 程序集加载失败，原因：",
    },
    "reload": {
        "en": "Reload",
        "zh-cn": "重新加载",
    },
    "mspythonExtension.activate.fail": {
        "en": "AiXCoder: Microsoft Python extension activate failed, reason: ",
        "zh-cn": "AiXCoder: Microsoft Python 插件启动失败，原因：",
    },
    "action.install": {
        "en": "Install...",
        "zh-cn": "安装...",
    },
    "redhatjavaExtension.activate.fail": {
        "en": "AiXCoder: Language Support for Java(TM) by Red Hat activate failed, reason: ",
        "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 启动失败，原因：",
    },
    "redhatjavaExtension.install": {
        "en": "AiXCoder: Language Support for Java(TM) by Red Hat is not installed or enabled. Please install Language Support for Java(TM) by Red Hat for the best experience.",
        "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 插件没有安装或启用。请安装 Language Support for Java(TM) by Red Hat 插件以获得最佳体验。",
    },
    "mscpptoolsExtension.install": {
        "en": "AiXCoder: C/C++ Extension is not installed or enabled. Please install C/C++ Extension for the best experience.",
        "zh-cn": "AiXCoder: C/C++ 插件没有安装或启用。请安装 C/C++ 插件以获得最佳体验。",
    },
    "newVersion": {
        "en": "A new aiXcoder version is available: %s, update now?",
        "zh-cn": "发现一个新的aiXcoder版本：%s，现在更新？",
    },
    "download": {
        "en": "Update",
        "zh-cn": "更新",
    },
    "ignoreThisVersion": {
        "en": "Ignore this version",
        "zh-cn": "忽略这个版本",
    },
    "aiXcoder.askedTelemetry": {
        "en": "AiXCoder will send anonymous usage data to improve user experience. You can disable it in settings by turning off aiXcoder.enableTelemetry. (Current: %s)",
        "zh-cn": "AiXCoder会发送匿名使用数据以提升用户体验。您可以在设置中关闭aiXcoder.enableTelemetry项来停止此行为。(当前：%s)",
    },
    "openSetting": {
        "en": "Open Settings...",
        "zh-cn": "打开设置...",
    },
    "aiXcoder.askedTelemetryOK": {
        "en": "OK",
        "zh-cn": "知道了",
    },
    "aiXcoder.askedTelemetryNo": {
        "en": "Don't send my usage data",
        "zh-cn": "不要发送我的使用数据",
    },
    "cpp.reload": {
        "en": "AiXCoder requires a reload to integrate with C/C++ extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 C/C++ 插件集成。",
    },
    "cpp.fail": {
        "en": "C/C++ Extension integration failed.",
        "zh-cn": "C/C++ 插件集成失败。",
    },
    "aiXcoder.endpoint.empty": {
        "en": "AiXCoder server endpoint is not set.",
        "zh-cn": "AiXCoder服务器端口未设置。",
    },
    "enabled": {
        "en": "Enabled",
        "zh-cn": "已启用",
    },
    "disabled": {
        "en": "Disabled",
        "zh-cn": "已关闭",
    },
    "model.switch": {
        "en": "Model for %s has been switched to %s.",
        "zh-cn": "%s 的模型已被切换到 %s。",
    },
};
export function localize(key: string, ...params: any[]) {
    return localizeMessages[key] ? util.format(localizeMessages[key][vscode.env.language] || localizeMessages[key].en, ...params) : key;
}
const myPackageJSON = vscode.extensions.getExtension("nnthink.aixcoder").packageJSON;
export const myVersion = myPackageJSON.version;

async function showInformationMessage(message: string, ...items: string[]): Promise<string | undefined> {
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

interface SingleWordCompletion {
    word: string;
    prob: number;
    options?: CompletionOptions;
}

interface SortResult {
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

function getReqText(document: vscode.TextDocument, position: vscode.Position) {
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

enum STAR_DISPLAY {
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

function formatSortData(results: SortResult | null, langUtil: LangUtil, document: vscode.TextDocument) {
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

async function fetchResults2(text: string, remainingText: string, fileName: string, ext: string, lang: string, document: vscode.TextDocument, starDisplay = STAR_DISPLAY.LEFT): Promise<{
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

async function fetchResults(document: vscode.TextDocument, position: vscode.Position, ext: string, lang: string, starDisplay: STAR_DISPLAY = STAR_DISPLAY.LEFT) {
    const _s = Date.now();
    const { text, remainingText, offsetID } = getReqText(document, position);
    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, lang, document, starDisplay);
    log("< fetch took " + (Date.now() - _s) + "ms");
    return {
        longResults,
        sortResults,
        offsetID,
        fetchTime,
    };
}

function sendPredictTelemetry(fetchTime: number, longResults: AiXCompletionItem[]) {
    if (fetchTime) {
        if (fetchTime === lastFetchTime && longResults.length > 0 && longResults[0].aixPrimary) {
            API.sendTelemetry("show");
        } else {
            API.sendTelemetry("nul");
        }
    }
}

const onDeactivateHandlers = [];

function activatePython(context: vscode.ExtensionContext) {
    const mspythonExtension = vscode.extensions.getExtension("ms-python.python");
    const sortResultAwaiters: {
        [key: string]: any,
        requesting: boolean,
        incomingResult: Promise<SortResult>,
        workingDocument: vscode.TextDocument,
    } = {
        requesting: false,
        incomingResult: null,
        workingDocument: null,
    };

    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;

        if (mspythonExtension) {
            log("AiX: ms-python.python detected");

            let aixHooked = false;
            let distjs: string;
            const aixHookedString = "/**AiXHooked-5**/";
            const distjsPath = path.join(mspythonExtension.extensionPath, "out", "client", "extension.js");
            distjs = await fs.promises.readFile(distjsPath, "utf-8");
            aixHooked = distjs.startsWith(aixHookedString);
            if (!aixHooked) {
                log("Hooking ms-python.python");
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
                    // inject aixKooked
                    distjs = distjs.replace(/(return \w+\.isTestExecution\(\)&&\(\w+.serviceContainer=\w+,\w+.serviceManager=\w+\)),(\w+)}/, "$1,$2.aixHooked=true,$2}");
                    // inject ms engine
                    const middlewareStart = SafeStringUtil.indexOf(distjs, "middleware:{provideCompletionItem:(");
                    const middlewareParamEnd = SafeStringUtil.indexOf(distjs, ")", middlewareStart + "middleware:{provideCompletionItem:(".length);
                    const middlewareLastParamStart = SafeStringUtil.lastIndexOf(distjs, ",", middlewareParamEnd) + 1;
                    const nextUglyName = SafeStringUtil.substring(distjs, middlewareLastParamStart, middlewareParamEnd);
                    const nextCallStart = SafeStringUtil.indexOf(distjs, `,${nextUglyName}(`, middlewareLastParamStart) + 1;
                    const nextCallEnd = SafeStringUtil.indexOf(distjs, ")", nextCallStart) + 1;
                    const nextCall = SafeStringUtil.substring(distjs, nextCallStart, nextCallEnd);
                    const handleResultCode = (r: string) => `const api = require(\"vscode\").extensions.getExtension(\"ms-python.python\").exports;if(api.aixhook){await api.aixhook(${r});}`;
                    distjs = SafeStringUtil.substring(distjs, 0, nextCallStart) + `new Promise(async (resolve, reject)=>{const rr=${nextCall};${handleResultCode("rr")}resolve(rr);})` + SafeStringUtil.substring(distjs, nextCallEnd);

                    // inject jedi engine
                    const pythonCompletionItemProviderSignature = "t.PythonCompletionItemProvider=l}";
                    const pythonCompletionItemProviderEnd = SafeStringUtil.indexOf(distjs, pythonCompletionItemProviderSignature);
                    const provideCompletionItemsStart = SafeStringUtil.lastIndexOf(distjs, "async provideCompletionItems(", pythonCompletionItemProviderEnd);
                    const provideCompletionItemsEnd = SafeStringUtil.indexOf(distjs, "return r}", provideCompletionItemsStart);
                    distjs = SafeStringUtil.substring(distjs, 0, provideCompletionItemsEnd) + handleResultCode("r") + SafeStringUtil.substring(distjs, provideCompletionItemsEnd);
                    if (distjs.length > oldSize) {
                        await fs.promises.writeFile(distjsPath, distjs, "utf-8");
                        if (mspythonExtension.isActive) {
                            const select = await vscode.window.showWarningMessage(localize("python.reload"), localize("reload"));
                            if (select === localize("reload")) {
                                vscode.commands.executeCommand("workbench.action.reloadWindow");
                            }
                        }
                        log("ms-python.python hooked");
                    } else {
                        await vscode.window.showWarningMessage(localize("python.fail"));
                    }
                } catch (e) {
                    console.log(e);
                    if (e instanceof SafeStringUtil.NotFoundError) {
                        await vscode.window.showWarningMessage(localize("python.fail"));
                    }
                }
            }

            mspythonExtension.exports.aixhook = async function(ll) {
                ll = await ll;
                if (ll.items) {
                    ll = ll.items;
                }
                mergeSortResult(ll, await sortResultAwaiters.incomingResult, sortResultAwaiters.workingDocument, STAR_DISPLAY.LEFT);
                return ll;
            };
        } else {
            vscode.window.showInformationMessage(localize("mspythonExtension.install"), localize("action.install")).then((selection) => {
                if (selection === localize("action.install")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-python.python"));
                }
            });
        }
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            log("=====================");
            try {
                sortResultAwaiters.requesting = true;
                sortResultAwaiters.workingDocument = document;
                let incomingResultResolver = null;
                sortResultAwaiters.incomingResult = new Promise((resolve, reject) => {
                    incomingResultResolver = resolve;
                });
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.python") as string;
                const { longResults, sortResults, offsetID, fetchTime } = await fetchResults(document, position, ext, "python");
                incomingResultResolver(sortResults);
                sortResultAwaiters.requesting = false;

                if (mspythonExtension) {
                    log("AiX: resolve " + offsetID + " " + sortResultAwaiters[offsetID]);
                    if (sortResultAwaiters[offsetID] !== "canceled") {
                        if (sortResultAwaiters[offsetID] == null) {
                            // LSE will go later
                            sortResultAwaiters[offsetID] = sortResults;
                        } else if (typeof sortResultAwaiters[offsetID] === "function") {
                            // LSE went earlier
                            sortResultAwaiters[offsetID](sortResults);
                        }
                    } else {
                        delete sortResultAwaiters[offsetID];
                    }
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("python"), document);
                    longResults.push(...sortLabels);
                }
                sendPredictTelemetry(fetchTime, longResults);
                log("provideCompletionItems ends");
                return longResults;
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const triggerCharacters = [".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "="];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "python", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "python", scheme: "untitled" }, provider, ...triggerCharacters));
}

function mergeSortResult(l: vscode.CompletionItem[], sortResults: SortResult, document: vscode.TextDocument, starDisplay = STAR_DISPLAY.LEFT) {
    const telemetryCommand: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.insert",
        arguments: ["use", "secondary", getInstance("java"), document],
    };
    let insertedRank = 1;
    for (const single of sortResults.list) {
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

function activateJava(context: vscode.ExtensionContext) {
    const redhatjavaExtension = vscode.extensions.getExtension("redhat.java");
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;
        if (redhatjavaExtension) {
            log("AiX: redhat.java detected");
            if (!msintellicode) {
                if (!redhatjavaExtension.isActive) {
                    try {
                        await redhatjavaExtension.activate();
                    } catch (error) {
                        log("AiX: redhat.java activate failed reason:");
                        log(error);
                        vscode.window.showErrorMessage(localize("redhatjavaExtension.activate.fail") + error);
                    }
                }
                onDeactivateHandlers.push(() => {
                    vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.enable", true);
                });
                try {
                    await vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.enable", false);
                } catch (reason) {
                    log("AiX: com.aixcoder.jdtls.extension.enable command  failed reason:");
                    log(reason);
                }
                log("AiX: com.aixcoder.jdtls.extension.enable command success");
            } else {
                log("AiX: visualstudioexptteam.vscodeintellicode detected");
            }
        } else {
            vscode.window.showInformationMessage(localize("redhatjavaExtension.install"), localize("action.install")).then((selection) => {
                if (selection === localize("action.install")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/redhat.java"));
                }
            });
        }
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            // log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.java") as string;
                if (redhatjavaExtension) {
                    const fetchPromise = fetchResults(document, position, ext, "java");
                    const redhatPromise = vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.completion", {
                        textDocument: {
                            uri: document.uri.toString(),
                        },
                        position,
                        context,
                    });
                    const { longResults, sortResults, fetchTime } = await fetchPromise;
                    const l = await redhatPromise as vscode.CompletionItem[];
                    mergeSortResult(l, sortResults, document);
                    longResults.push(...l);
                    sendPredictTelemetry(fetchTime, longResults);
                    return longResults;
                } else {
                    const { longResults, sortResults, fetchTime } = await fetchResults(document, position, ext, "java");
                    const sortLabels = formatSortData(sortResults, getInstance("java"), document);
                    longResults.push(...sortLabels);
                    sendPredictTelemetry(fetchTime, longResults);
                    return longResults;
                }
                // log("provideCompletionItems ends");
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const triggerCharacters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "="];
    if (!msintellicode) {
        triggerCharacters.push(".");
    }
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "java", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "java", scheme: "untitled" }, provider, ...triggerCharacters));
}

async function activateCPP(context: vscode.ExtensionContext) {
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    const mscpp = vscode.extensions.getExtension("ms-vscode.cpptools");
    const activated = false;
    const sortResultAwaiters = {};
    let clients: any;
    if (mscpp) {
        let aixHooked = false;
        let distjs: string;
        if (mscpp.isActive) {
            aixHooked = mscpp.exports.getApi().getClients != null;
        } else {
            const distjsPath = path.join(mscpp.extensionPath, "dist", "main.js");
            distjs = await fs.promises.readFile(distjsPath, "utf-8");
            aixHooked = distjs.startsWith("/**AiXHooked**/");
        }
        if (!aixHooked) {
            const distjsPath = path.join(mscpp.extensionPath, "dist", "main.js");
            await fs.promises.copyFile(distjsPath, distjsPath + ".bak");
            const oldSize = distjs.length;
            distjs = "/**AiXHooked**/" + distjs;
            const cpptoolsSignature = "t.CppTools=class{";
            const cpptoolsStart = SafeStringUtil.indexOf(distjs, cpptoolsSignature) + cpptoolsSignature.length;
            const languageServerUglyEnd = SafeStringUtil.indexOf(distjs, ".getClients()", cpptoolsStart);
            let languageServerUglyStart = languageServerUglyEnd;
            while (languageServerUglyStart > cpptoolsStart) {
                languageServerUglyStart--;
                if (!distjs[languageServerUglyStart].match(/[a-zA-Z]/)) {
                    languageServerUglyStart++;
                    break;
                }
            }
            const languageServerUgly = SafeStringUtil.substring(distjs, languageServerUglyStart, languageServerUglyEnd);
            distjs = SafeStringUtil.substring(distjs, 0, cpptoolsStart) + `getClients(){return ${languageServerUgly}.getClients()}` + SafeStringUtil.substring(distjs, cpptoolsStart);
            if (distjs.length > oldSize) {
                await fs.promises.writeFile(distjsPath, distjs, "utf-8");
                if (mscpp.isActive) {
                    const select = await vscode.window.showWarningMessage(localize("cpp.reload"), localize("reload"));
                    if (select === localize("reload")) {
                        vscode.commands.executeCommand("workbench.action.reloadWindow");
                    }
                }
            } else {
                await vscode.window.showWarningMessage(localize("cpp.fail"));
            }
        }

        if (mscpp) {
            if (!mscpp.isActive) {
                await mscpp.activate();
            }
            clients = mscpp.exports.getApi().getClients();
        }
    }
    async function _activate() {
        if (activated) {
            return;
        }
        if (!mscpp) {
            vscode.window.showInformationMessage(localize("mscpptoolsExtension.install"), localize("action.install")).then((selection) => {
                if (selection === localize("action.install")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-vscode.cpptools"));
                }
            });
        }
    }

    function getHookedProvideCompletionItems(oldProvideCompletionItems) {
        return async (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext, provideCompletionItems) => {
            const resultP = oldProvideCompletionItems(document, position, token, context, provideCompletionItems);
            if (resultP) {
                const offsetID = getReqText(document, position).text;
                const l: vscode.CompletionList = await resultP;
                let sortResults;
                if (sortResultAwaiters[offsetID] == null) {
                    sortResults = await new Promise((resolve, reject) => {
                        const canceller = setTimeout(() => {
                            reject("time out");
                            delete sortResultAwaiters[offsetID];
                        }, 5000);
                        sortResultAwaiters[offsetID] = (_) => {
                            clearTimeout(canceller);
                            resolve(_);
                        };
                    });
                } else {
                    sortResults = await sortResultAwaiters[offsetID];
                }
                delete sortResultAwaiters[offsetID];
                const telemetryCommand: vscode.Command = {
                    title: "AiXTelemetry",
                    command: "aiXcoder.insert",
                    arguments: ["use", "secondary", getInstance("cpp"), document],
                };
                for (let i = 0; i < sortResults.list.length; i++) {
                    const single: SingleWordCompletion = sortResults.list[i];
                    let found = false;
                    for (const systemCompletion of l.items) {
                        if (systemCompletion.sortText == null) {
                            systemCompletion.sortText = systemCompletion.filterText;
                        }
                        if (systemCompletion.insertText === single.word) {
                            // systemCompletion.label = "⭐" + systemCompletion.label;
                            systemCompletion.label = systemCompletion.label + "⭐";
                            systemCompletion.sortText = "0." + i;
                            systemCompletion.command = { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) };
                            found = true;
                        }
                    }
                    if (!found && single.options && single.options.forced) {
                        l.items.push({
                            label: single.word + "⭐",
                            insertText: single.word,
                            sortText: "0." + i,
                            command: { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) },
                            kind: vscode.CompletionItemKind.Variable,
                        });
                    }
                }
                return l;
            }
            return null;
        };
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.cpp") as string;
            // log("=====================");
            try {
                const { text, remainingText } = getReqText(document, position);
                const offsetID = text;
                let r = null;
                if (mscpp) {
                    const resolver: (_: SortResult) => void = await new Promise((r, j) => {
                        if (sortResultAwaiters[offsetID] == null) {
                            const p = new Promise((resolve, reject) => {
                                const canceller = setTimeout(() => {
                                    log("master timeout, reject");
                                    reject("time out");
                                    delete sortResultAwaiters[offsetID];
                                }, 5000);
                                r((_) => {
                                    clearTimeout(canceller);
                                    resolve(_);
                                });
                            });
                            sortResultAwaiters[offsetID] = p;
                        } else {
                            r(sortResultAwaiters[offsetID]);
                        }
                    });
                    const client = clients.ActiveClient.languageClient;
                    const oldProvideCompletionItems = client.clientOptions.middleware.provideCompletionItem;
                    if (!oldProvideCompletionItems.aixhooked) {
                        log("Hooking C++ extension...");
                        client.clientOptions.middleware.provideCompletionItem = getHookedProvideCompletionItems(oldProvideCompletionItems);
                        client.clientOptions.middleware.provideCompletionItem.aixhooked = true;
                        delete sortResultAwaiters[offsetID]; // it won't work first time
                        log("C++ extension Hooked");
                    }
                    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, "cpp", document, STAR_DISPLAY.NONE);
                    if (typeof resolver === "function") {
                        resolver(sortResults);
                    }
                    sendPredictTelemetry(fetchTime, longResults);
                    r = longResults;
                } else {
                    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, "cpp", document, STAR_DISPLAY.LEFT);
                    const sortLabels = formatSortData(sortResults, getInstance("cpp"), document);
                    longResults.push(...sortLabels);
                    sendPredictTelemetry(fetchTime, longResults);
                    r = longResults;
                }
                log("provideCompletionItems ends");
                return r;
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const triggerCharacters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "="];
    if (!msintellicode) {
        triggerCharacters.push(".");
    }
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "c", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "c", scheme: "untitled" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "cpp", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "cpp", scheme: "untitled" }, provider, ...triggerCharacters));
}

interface ModelQuickPickItem extends vscode.QuickPickItem {
    lang: string;
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

    const commandHandler = async () => {
        const langs = { cpp: "C++/C", python: "Python", java: "Java" };
        const selectedLang = await vscode.window.showQuickPick((async () => {
            const displays: ModelQuickPickItem[] = [];
            for (const lang of Object.keys(langs)) {
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
                const models = await API.getModels();
                const filtered = models.filter((model) => model.toLowerCase().endsWith(`(${selectedLang.lang})`));
                return filtered;
            })());

            vscode.workspace.getConfiguration().update("aiXcoder.model." + selectedLang.lang, selectedModel);
            vscode.window.showInformationMessage(util.format(localize("model.switch"), langs[selectedLang.lang], selectedModel));
        }
    };

    context.subscriptions.push(vscode.commands.registerCommand("aixcoder.switchModel", commandHandler));

    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    if (msintellicode) {
        vscode.window.showInformationMessage(localize("msintellicode.enabled"));
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
