"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as net from "net";
import * as portfinder from "portfinder";
import * as vscode from "vscode";
import * as API from "./API";
import { getInstance } from "./lang/commons";
import { LangUtil } from "./lang/langUtil";
import Preference from "./Preference";

function localize(key: string) {
    const messages = {
        "mspythonExtension.install": {
            "en": "AiXCoder: Microsoft Python extension is not installed or enabled. Please install Microsoft Python extension for the best experience.",
            "zh-cn": "AiXCoder: Microsoft Python插件没有安装或启用。请安装Microsoft Python插件以获得最佳体验。",
        },
        "assembly.load.fail": {
            "en": "AiXCoder: assembly load failed, reason: ",
            "zh-cn": "AiXCoder: 程序集加载失败，原因：",
        },
        "mspythonExtension.activate.fail": {
            "en": "AiXCoder: Microsoft Python Extension activate failed, reason: ",
            "zh-cn": "AiXCoder: Microsoft Python Extension 启动失败，原因：",
        },
        "action.install": {
            "en": "Install...",
            "zh-cn": "安装...",
        },
        "redhatjavaExtension.activate.fail": {
            "en": "AiXCoder: Language Support for Java(TM) by Red Hat activate failed, reason: ",
            "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 启动失败，原因：",
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
        console.log("send request");
        lastText = text;
        lastFetchTime = new Date().getTime();
        const queryUUID = Math.floor(Math.random() * 10000);
        lastQueryUUID = queryUUID;
        lastPromise = API.predict(text, ext, remainingText, lastQueryUUID, fileID).catch((err) => {
            console.log(err);
            if (lastQueryUUID === queryUUID) {
                lastQueryUUID = null;
                lastPromise = null;
            }
        });
        return { body: lastPromise, queryUUID, remote: true };
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
        if (result.tokens.length > 0) {
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

const onDeactivateHandlers = [];

function activatePython(context: vscode.ExtensionContext) {
    const mspythonExtension = vscode.extensions.getExtension("ms-python.python");
    const sortResultAwaiters = {};

    if (mspythonExtension) {
        function loadLanguageServerExtension(port) {
            const assemblyPath = "D:\\projects\\AiXForMSPython\\AiXForMSPython\\bin\\x64\\Debug\\netcoreapp2.1\\AiXForMSPython.dll";
            const l = vscode.commands.executeCommand("python._loadLanguageServerExtension", {
                assembly: assemblyPath,
                typeName: "AiXCoder.PythonTools.LanguageServerExtensionProvider",
                properties: { port },
            });
            if (l) {
                // console.log("AiX: command issued");
                l.then(() => {
                    console.log("AiX: assembly loaded");
                }, (reason) => {
                    console.error("AiX: assembly load failed reason: " + reason);
                    vscode.window.showErrorMessage(localize("assembly.load.fail") + reason);
                });
            } else {
                console.log("AiX: command failed");
            }
        }
        const server = net.createServer(function(s) {
            console.log("AiX: socket server connected");
            s.on("data", (data) => {
                const offset = data.readInt32LE(0);
                // console.log("AiX: socket server received " + offset);
                if (sortResultAwaiters[offset]) {
                    if (sortResultAwaiters[offset].queryUUID) {
                        // console.log("AiX: socket server send fast");
                        s.write(JSON.stringify(sortResultAwaiters[offset]));
                        delete sortResultAwaiters[offset];
                    } else {
                        sortResultAwaiters[offset](null);
                    }
                } else {
                    new Promise((resolve, reject) => {
                        const cancelTask = setTimeout(() => {
                            // console.log("AiX: socket server canceled");
                            resolve(null);
                        }, 1000 * 5);
                        // console.log("sortResultAwaiters[" + offset + "] set");
                        sortResultAwaiters[offset] = (sortResult4LSE) => {
                            clearTimeout(cancelTask);
                            resolve(sortResult4LSE);
                        };
                    }).then((sortResult4LSE) => {
                        if (sortResult4LSE) {
                            delete sortResultAwaiters[offset];
                            // console.log("AiX: socket server send " + sortResult4LSE);
                            s.write(JSON.stringify(sortResult4LSE));
                        } else {
                            sortResultAwaiters[offset] = "canceled";
                            // console.log("AiX: socket server no result");
                            s.write("-");
                        }
                    });
                }
            });
        });

        server.on("close", () => {
            console.log("AiX: socket server closed.");
        });

        server.on("error", (e) => {
            console.log(e);
        });

        portfinder.getPort({
            port: 20000,
        }, (err, localPort) => {
            if (err) {
                console.log(err);
                return;
            }
            server.listen(localPort, "localhost");
            console.log("AiX: socket server listen on " + localPort);
            if (mspythonExtension.isActive) {
                loadLanguageServerExtension(localPort);
            } else {
                mspythonExtension.activate().then(() => {
                    loadLanguageServerExtension(localPort);
                }, (reason) => {
                    console.error("AiX: mspythonExtension activate failed reason: " + reason);
                    vscode.window.showErrorMessage(localize("mspythonExtension.activate.fail") + reason);
                });
            }
        });
    } else {
        vscode.window.showInformationMessage(localize("mspythonExtension.install"), localize("action.install")).then((selection) => {
            if (selection === localize("action.install")) {
                vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-python.python"));
            }
        });
    }

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "python", scheme: "file" }, {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            // console.log("=====================");
            try {
                const { text, remainingText, offsetID } = getReqText(document, position);
                const { body, queryUUID, remote } = fetch("python(Python)", text, remainingText, document.fileName);

                const fetchBody = await body;
                console.log("get request " + (new Date().getTime() - lastFetchTime));
                console.log(fetchBody);
                if (fetchBody == null) { return []; }
                const predictResults = JSON.parse(fetchBody);
                let strLabels = formatResData(predictResults, getInstance("python"));
                // console.log("predict result:");
                // console.log(strLabels);
                const results = {
                    queryUUID: queryUUID.toString(),
                    list: predictResults.data.length > 0 ? predictResults.data[0].sort : [],
                };
                // console.log("mina result:");
                results.list = results.list.map(([prob, word]) => ({ prob, word }));
                // console.log(results);

                if (mspythonExtension) {
                    // console.log("AiX: resolve " + offsetID + " " + extension[offsetID]);
                    if (sortResultAwaiters[offsetID] !== "canceled") {
                        if (sortResultAwaiters[offsetID] == null) {
                            // LSE will go later
                            sortResultAwaiters[offsetID] = results;
                        } else if (typeof sortResultAwaiters[offsetID] === "function") {
                            // LSE went earlier
                            sortResultAwaiters[offsetID](results);
                        }
                    } else {
                        delete sortResultAwaiters[offsetID];
                    }
                } else {
                    const sortLabels = formatSortData(results);
                    strLabels = strLabels.concat(sortLabels);
                }
                // console.log("provideCompletionItems ends");
                return strLabels;
            } catch (e) {
                console.log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    }, ".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "="));
}

function activateJava(context: vscode.ExtensionContext) {
    const redhatjavaExtension = vscode.extensions.getExtension("redhat.java");
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    const msintellicodeTriggers = [".", "@", "#", "*"];
    if (redhatjavaExtension) {
        if (!msintellicode) {
            const redhatjavaExtensionReady = redhatjavaExtension.isActive ? Promise.resolve() : redhatjavaExtension.activate();
            redhatjavaExtensionReady.then(() => {
                onDeactivateHandlers.push(() => {
                    vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.enable", true);
                });
                return vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.enable", false);
            }, (reason) => {
                console.error("AiX: redhatjavaExtension activate failed reason: " + reason);
                vscode.window.showErrorMessage(localize("redhatjavaExtension.activate.fail") + reason);
            });
        }
    }

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "java", scheme: "file" }, {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, context: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            // console.log("=====================");
            try {
                const { text, remainingText } = getReqText(document, position);
                const { body, queryUUID } = fetch("java(Java)", text, remainingText, document.fileName);

                const fetchBody = await body;
                console.log("get request " + (new Date().getTime() - lastFetchTime));
                console.log(fetchBody);
                if (fetchBody == null) { return []; }
                const predictResults = JSON.parse(fetchBody);
                let strLabels = formatResData(predictResults, getInstance("java"));
                // console.log("predict result:");
                // console.log(strLabels);
                const results = {
                    queryUUID: queryUUID.toString(),
                    list: predictResults.data.length > 0 ? predictResults.data[0].sort : [],
                };
                // console.log("mina result:");
                results.list = results.list == null ? [] : results.list.map(([prob, word]) => ({ prob, word }));
                // console.log(results);

                if (redhatjavaExtension) {
                    if (msintellicode && msintellicodeTriggers.indexOf(context.triggerCharacter) >= 0) {
                        // conflict with msintellicode
                    } else {
                        const l: vscode.CompletionItem[] = await vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.completion", {
                            textDocument: {
                                uri: document.uri.toString(),
                            },
                            position,
                            context,
                        });
                        for (let i = 0; i < results.list.length; i++) {
                            const single: SingleWordCompletion = results.list[i];
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
                        strLabels = strLabels.concat(l);
                    }
                } else {
                    const sortLabels = formatSortData(results);
                    strLabels = strLabels.concat(sortLabels);
                }
                // console.log("provideCompletionItems ends");
                return strLabels;
            } catch (e) {
                console.log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    }, ".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "="));
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log("AiX: aixcoder activate");
    Preference.init(context);

    activatePython(context);
    activateJava(context);
}

// this method is called when your extension is deactivated
export function deactivate() {
    for (const onDeactivateHandler of onDeactivateHandlers) {
        onDeactivateHandler();
    }
}
