"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as net from "net";
import * as portfinder from "portfinder";
import * as vscode from "vscode";
import * as API from "./API";
import { getInstance } from "./lang/commons";
import { LangUtil } from "./lang/langUtil";
import log from "./logger";
import Preference from "./Preference";

export function localize(key: string) {
    const messages = {
        "mspythonExtension.install": {
            "en": "AiXCoder: Microsoft Python extension is not installed or enabled. Please install Microsoft Python extension for the best experience.",
            "zh-cn": "AiXCoder: Microsoft Python 插件没有安装或启用。请安装 Microsoft Python 插件以获得最佳体验。",
        },
        "assembly.load.fail": {
            "en": "AiXCoder: assembly load failed, reason: ",
            "zh-cn": "AiXCoder: 程序集加载失败，原因：",
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
            "en": "AiXCoder: Language Support for Java(TM) by Red Hat is not installed or enabled. Please installLanguage Support for Java(TM) by Red Hat for the best experience.",
            "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 插件没有安装或启用。请安装 Language Support for Java(TM) by Red Hat 插件以获得最佳体验。",
        },
        "newVersion": {
            "en": "A new aiXcoder version is available: %d, update now?",
            "zh-cn": "发现一个新的aiXcoder版本：%d，现在更新？",
        },
        "download": {
            "en": "Update",
            "zh-cn": "更新",
        },
        "ignoreThisVersion": {
            "en": "Ignore this version",
            "zh-cn": "忽略这个版本",
        },
    };
    return messages[key][vscode.env.language] || messages[key].en;
}

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
        return { body: lastPromise, queryUUID };
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

// 处理返回的值，最终变成放入提示框的内容
function formatResData(results: any, langUtil: LangUtil): vscode.CompletionItem[] {
    const r: vscode.CompletionItem[] = [];
    for (const result of results.data) {
        if (result.tokens.length > 1) {
            const mergedTokens = [result.current + result.tokens[0], ...result.tokens.slice(1)];
            let title = langUtil.render(mergedTokens, 0);
            let rendered = title.replace(/(?=\$\{[^}]+\})/g, "\\");
            if (result.r_completion && result.r_completion.length > 0) {
                // tslint:disable-next-line: no-invalid-template-strings
                rendered += "${0}" + result.r_completion.join("");
                title += "" + result.r_completion.join("");
            }
            r.push({
                label: "⭐" + title,
                filterText: title,
                insertText: new vscode.SnippetString(rendered),
                kind: vscode.CompletionItemKind.Snippet,
                sortText: String.fromCharCode(0),
            });
        }
    }
    return r;
}

function formatSortData(results: SortResult | null) {
    if (results == null) { return []; }
    const r: vscode.CompletionItem[] = [];
    for (let i = 0; i < results.list.length; i++) {
        const single = results.list[i];
        if (single.prob < 0.1) {
            break;
        }
        if (single.word.match(/^<.+>$/)) {
            continue;
        }
        r.push({
            label: "⭐" + single.word,
            filterText: single.word,
            insertText: single.word,
            kind: vscode.CompletionItemKind.Variable,
            sortText: String.fromCharCode(0) + String.fromCharCode(i),
        });
    }
    return r;
}

async function fetchResults(document, position) {
    const _s = Date.now();
    const { text, remainingText, offsetID } = getReqText(document, position);
    const { body, queryUUID } = fetch("python(Python)", text, remainingText, document.fileName);

    let fetchBody = await body;
    log(fetchBody);
    if (fetchBody == null) {
        fetchBody = "{data:[]}";
    }
    const predictResults = fetchBody && typeof fetchBody === "string" ? JSON.parse(fetchBody) : fetchBody;
    const strLabels = formatResData(predictResults, getInstance("python"));
    // log("predict result:");
    // log(strLabels);
    const results = {
        queryUUID: queryUUID.toString(),
        list: predictResults.data.length > 0 ? predictResults.data[0].sort || [] : [],
    };
    // log("mina result:");
    results.list = results.list.map(([prob, word]) => ({ prob, word }));
    log("< fetch took " + (Date.now() - _s) + "ms");
    return {
        longResults: strLabels,
        sortResults: results,
        offsetID,
    };
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
                        vscode.window.showErrorMessage(localize("assembly.load.fail") + e);
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
                const { longResults, sortResults, offsetID } = await fetchResults(document, position);

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
    // context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "python", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "python" }, provider, ...triggerCharacters));
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
                const { longResults, sortResults } = await fetchResults(document, position);

                if (redhatjavaExtension) {
                    const l: vscode.CompletionItem[] = await vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.completion", {
                        textDocument: {
                            uri: document.uri.toString(),
                        },
                        position,
                        context,
                    });
                    for (let i = 0; i < sortResults.list.length; i++) {
                        const single: SingleWordCompletion = sortResults.list[i];
                        for (const systemCompletion of l) {
                            if (systemCompletion.sortText == null) {
                                systemCompletion.sortText = systemCompletion.filterText;
                            }
                            if (systemCompletion.insertText === single.word) {
                                systemCompletion.label = "⭐" + systemCompletion.label;
                                systemCompletion.sortText = "0." + i;
                                break;
                            }
                        }
                    }
                    longResults.push(...l);
                } else {
                    const sortLabels = formatSortData(sortResults);
                    longResults.push(...sortLabels);
                }
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
    if (msintellicode) {
        triggerCharacters.push(".");
    }
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "java", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "java", scheme: "untitled" }, provider, ...triggerCharacters));
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    log("AiX: aiXcoder activating");
    Preference.init(context);
    API.checkUpdate();
    activatePython(context);
    activateJava(context);
    log("AiX: aiXcoder activated");
}

// this method is called when your extension is deactivated
export function deactivate() {
    for (const onDeactivateHandler of onDeactivateHandlers) {
        onDeactivateHandler();
    }
}
