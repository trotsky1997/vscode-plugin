"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from "fs";
import * as net from "net";
import * as path from "path";
import * as portfinder from "portfinder";
import * as util from "util";
import * as vscode from "vscode";
import * as API from "./API";
import { getInstance } from "./lang/commons";
import { LangUtil } from "./lang/langUtil";
import log from "./logger";
import Preference from "./Preference";

export function localize(key: string, ...params: any[]) {
    const messages = {
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
    };
    return messages[key] ? util.format(messages[key][vscode.env.language] || messages[key].en, ...params) : key;
}
const myPackageJSON = vscode.extensions.getExtension("nnthink.aixcoder").packageJSON;
export const myVersion = myPackageJSON.version;

interface SingleWordCompletion {
    word: string;
    prob: number;
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
function formatResData(results: any, langUtil: LangUtil, starDisplay: STAR_DISPLAY = STAR_DISPLAY.LEFT): AiXCompletionItem[] {
    const r: AiXCompletionItem[] = [];
    const command: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.sendTelemetry",
        arguments: ["use", "primary"],
    };
    for (const result of results.data) {
        if (result.tokens.length > 1) {
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
                sortText: String.fromCharCode(0),
                command,
                aixPrimary: true,
            });
        }
    }
    return r;
}

function formatSortData(results: SortResult | null) {
    if (results == null) { return []; }
    const r: vscode.CompletionItem[] = [];
    const command: vscode.Command = {
        title: "AiXTelemetry",
        command: "aiXcoder.sendTelemetry",
        arguments: ["use", "secondary"],
    };
    for (let i = 0; i < results.list.length; i++) {
        const single = results.list[i];
        if (single.word.match(/^<.+>$/)) {
            continue;
        }
        r.push({
            label: "⭐" + single.word,
            filterText: single.word,
            insertText: single.word,
            kind: vscode.CompletionItemKind.Variable,
            sortText: String.fromCharCode(0) + String.fromCharCode(i),
            command,
        });
    }
    return r;
}

async function fetchResults2(text: string, remainingText: string, fileName: string, ext: string, lang: string, starDisplay: STAR_DISPLAY = STAR_DISPLAY.LEFT): Promise<{
    longResults: AiXCompletionItem[],
    sortResults: SortResult,
    fetchTime: number,
}> {
    const { body, queryUUID, fetchTime } = fetch(ext, text, remainingText, fileName);

    let fetchBody = await body;
    log(fetchBody);
    if (fetchBody == null) {
        fetchBody = "{data:[]}";
    }
    const predictResults = fetchBody && typeof fetchBody === "string" ? JSON.parse(fetchBody) : fetchBody;
    const strLabels = formatResData(predictResults, getInstance(lang), starDisplay);
    // log("predict result:");
    // log(strLabels);
    const results = {
        queryUUID: queryUUID.toString(),
        list: predictResults.data.length > 0 ? predictResults.data[0].sort || [] : [],
    };
    // log("mina result:");
    results.list = results.list.map(([prob, word]) => ({ prob, word }));
    return {
        longResults: strLabels,
        sortResults: results,
        fetchTime,
    };
}

async function fetchResults(document: vscode.TextDocument, position: vscode.Position, ext: string, lang: string, starDisplay: STAR_DISPLAY = STAR_DISPLAY.LEFT) {
    const _s = Date.now();
    const { text, remainingText, offsetID } = getReqText(document, position);
    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, lang, starDisplay);
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
    let mspythonExtension = vscode.extensions.getExtension("ms-python.python");
    const sortResultAwaiters = {};

    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;

        if (mspythonExtension) {
            log("AiX: ms-python.python detected");
            async function loadLanguageServerExtension(port) {
                const assemblyPath = __dirname + "/AiXForMSPython.dll";
                const l = vscode.commands.executeCommand("python._loadLanguageServerExtension", {
                    assembly: assemblyPath,
                    typeName: "AiXCoder.PythonTools.LanguageServerExtensionProvider",
                    properties: { port, debug: false },
                });
                if (l) {
                    // log("AiX: command issued");
                    try {
                        await l;
                        log("AiX: python language server assembly loaded");
                    } catch (e) {
                        log("AiX: assembly load failed reason:");
                        log(e);
                        const select = await vscode.window.showErrorMessage(localize("assembly.load.fail") + e, localize("reload"));
                        if (select === localize("reload")) {
                            vscode.commands.executeCommand("workbench.action.reloadWindow");
                        }
                        mspythonExtension = undefined;
                    }
                } else {
                    log("AiX: command failed");
                    mspythonExtension = undefined;
                }
            }
            const server = net.createServer(function(s) {
                log("AiX: python language server socket server connected");
                s.on("data", (data) => {
                    const offset = data.readInt32LE(0);
                    // log("AiX: socket server received " + offset);
                    if (sortResultAwaiters[offset]) {
                        if (sortResultAwaiters[offset].queryUUID) {
                            // log("AiX: socket server send fast");
                            s.write(JSON.stringify(sortResultAwaiters[offset]));
                            delete sortResultAwaiters[offset];
                        } else {
                            sortResultAwaiters[offset](null);
                        }
                    } else {
                        new Promise((resolve, reject) => {
                            const cancelTask = setTimeout(() => {
                                // log("AiX: socket server canceled");
                                resolve(null);
                            }, 1000 * 5);
                            // log("sortResultAwaiters[" + offset + "] set");
                            sortResultAwaiters[offset] = (sortResult4LSE) => {
                                clearTimeout(cancelTask);
                                resolve(sortResult4LSE);
                            };
                        }).then((sortResult4LSE) => {
                            if (sortResult4LSE) {
                                delete sortResultAwaiters[offset];
                                // log("AiX: socket server send " + sortResult4LSE);
                                s.write(JSON.stringify(sortResult4LSE));
                            } else {
                                sortResultAwaiters[offset] = "canceled";
                                // log("AiX: socket server no result");
                                s.write("-");
                            }
                        });
                    }
                });
            });

            server.on("close", () => {
                log("AiX: python language server socket server closed.");
            });

            server.on("error", (e) => {
                log(e);
            });

            return new Promise((resolve, reject) => {
                portfinder.getPort({
                    port: 20000,
                }, (err, localPort) => {
                    if (err) {
                        log(err);
                        reject(err);
                        return;
                    }
                    server.listen(localPort, "localhost");
                    log("AiX: python language server socket server listen on " + localPort);
                    if (mspythonExtension.isActive) {
                        resolve(loadLanguageServerExtension(localPort));
                    } else {
                        mspythonExtension.activate().then(() => {
                            resolve(loadLanguageServerExtension(localPort));
                        }, (reason) => {
                            log("AiX: ms-python.python activate failed reason:");
                            log(reason);
                            vscode.window.showErrorMessage(localize("mspythonExtension.activate.fail") + reason);
                        });
                    }
                });
            });
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
            // log("=====================");
            try {
                const { longResults, sortResults, offsetID, fetchTime } = await fetchResults(document, position, "python(Python)", "python");

                if (mspythonExtension) {
                    // log("AiX: resolve " + offsetID + " " + extension[offsetID]);
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
                    const sortLabels = formatSortData(sortResults);
                    longResults.push(...sortLabels);
                }
                sendPredictTelemetry(fetchTime, longResults);
                // log("provideCompletionItems ends");
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
                const { longResults, sortResults, fetchTime } = await fetchResults(document, position, "java(Java)", "java");

                if (redhatjavaExtension) {
                    const l: vscode.CompletionItem[] = await vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.completion", {
                        textDocument: {
                            uri: document.uri.toString(),
                        },
                        position,
                        context,
                    });
                    const telemetryCommand: vscode.Command = {
                        title: "AiXTelemetry",
                        command: "aiXcoder.sendTelemetry",
                        arguments: ["use", "secondary"],
                    };
                    for (let i = 0; i < sortResults.list.length; i++) {
                        const single: SingleWordCompletion = sortResults.list[i];
                        for (const systemCompletion of l) {
                            if (systemCompletion.sortText == null) {
                                systemCompletion.sortText = systemCompletion.filterText;
                            }
                            if (systemCompletion.insertText === single.word) {
                                systemCompletion.label = "⭐" + systemCompletion.label;
                                systemCompletion.sortText = "0." + i;
                                systemCompletion.command = telemetryCommand;
                                break;
                            }
                        }
                    }
                    longResults.push(...l);
                } else {
                    const sortLabels = formatSortData(sortResults);
                    longResults.push(...sortLabels);
                }
                sendPredictTelemetry(fetchTime, longResults);
                // log("provideCompletionItems ends");
                return longResults;
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
    // const _m = require("module");
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    const mscpp = vscode.extensions.getExtension("ms-vscode.cpptools");
    const activated = false;
    const sortResultAwaiters = {};
    let clients;
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
            const cpptoolsStart = distjs.indexOf(cpptoolsSignature) + cpptoolsSignature.length;
            const languageServerUglyEnd = distjs.indexOf(".getClients()", cpptoolsStart);
            let languageServerUglyStart = languageServerUglyEnd;
            while (languageServerUglyStart > cpptoolsStart) {
                languageServerUglyStart--;
                if (!distjs[languageServerUglyStart].match(/[a-zA-Z]/)) {
                    languageServerUglyStart++;
                    break;
                }
            }
            const languageServerUgly = distjs.substring(languageServerUglyStart, languageServerUglyEnd);
            distjs = distjs.substring(0, cpptoolsStart) + `getClients(){return ${languageServerUgly}.getClients()}` + distjs.substring(cpptoolsStart);
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
            // const lsext = _m._cache[path.join(mscpp.extensionPath, "out", "src", "LanguageServer", "extension.js")];
            clients = mscpp.exports.getApi().getClients();
        }
    } else {
        vscode.window.showInformationMessage(localize("mscpptoolsExtension.install"), localize("action.install")).then((selection) => {
            if (selection === localize("action.install")) {
                vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-vscode.cpptools"));
            }
        });
    }
    async function _activate() {
        if (activated) {
            return;
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
                const our = [];
                const telemetryCommand: vscode.Command = {
                    title: "AiXTelemetry",
                    command: "aiXcoder.sendTelemetry",
                    arguments: ["use", "secondary"],
                };
                for (let i = 0; i < sortResults.list.length; i++) {
                    const single: SingleWordCompletion = sortResults.list[i];
                    for (const systemCompletion of l.items) {
                        if (systemCompletion.sortText == null) {
                            systemCompletion.sortText = systemCompletion.filterText;
                        }
                        if (systemCompletion.insertText === single.word) {
                            // systemCompletion.label = "⭐" + systemCompletion.label;
                            systemCompletion.label = systemCompletion.label + "⭐";
                            systemCompletion.sortText = "0." + i;
                            systemCompletion.command = telemetryCommand;
                            our.push(systemCompletion);
                            break;
                        }
                    }
                }
                log(our);
                return l;
            }
            return null;
        };
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
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
                    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, "cpp(Cpp)", "cpp", STAR_DISPLAY.NONE);
                    if (typeof resolver === "function") {
                        resolver(sortResults);
                    }
                    sendPredictTelemetry(fetchTime, longResults);
                    r = longResults;
                } else {
                    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, "cpp(Cpp)", "cpp", STAR_DISPLAY.LEFT);
                    const sortLabels = formatSortData(sortResults);
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

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export async function activate(context: vscode.ExtensionContext) {
    log("AiX: aiXcoder activating");

    const endpoint = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
    if (!endpoint) {
        vscode.window.showWarningMessage(localize("aiXcoder.endpoint.empty"), localize("openSetting")).then((selected) => {
            if (selected === localize("openSetting")) {
                vscode.commands.executeCommand("workbench.action.openSettings", `aiXcoder`);
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
    context.subscriptions.push(vscode.commands.registerCommand("aiXcoder.sendTelemetry", (type: string, subtype: string) => {
        API.sendTelemetry(type, subtype);
    }));
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
