"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as net from "net";
import * as vscode from "vscode";
import { getInstance } from "./lang/commons";
import { LangUtil } from "./lang/langUtil";

const request = require("request-promise");

enum MessageType {
    sort = 1,
    notice = 2,
    active = 3,
    login = 4,
}

interface SingleWordCompletion {
    word: string;
    prob: number;
}

interface SortResult {
    queryUUID: string;
    list: SingleWordCompletion[];
}

interface Message {
    type: MessageType;
    data: string;
}

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
    console.log("AiX: aixcoder activate");
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
                console.log("AiX: command issued");
                l.then(() => {
                    console.log("AiX: assembly loaded");
                }, (reason) => {
                    console.log("AiX: assembly load failed reason: " + reason);
                });
            } else {
                console.log("AiX: command failed");
            }
        }
        const server = net.createServer(function(s) {
            console.log("AiX: socket server connected");
            s.on("data", (data) => {
                const offset = data.readInt32LE(0);
                console.log("AiX: socket server received " + offset);
                if (sortResultAwaiters[offset]) {
                    if (sortResultAwaiters[offset].queryUUID) {
                        console.log("AiX: socket server send fast");
                        s.write(JSON.stringify(sortResultAwaiters[offset]));
                        delete sortResultAwaiters[offset];
                    } else {
                        sortResultAwaiters[offset](null);
                    }
                }
                new Promise((resolve, reject) => {
                    const cancelTask = setTimeout(() => {
                        console.log("AiX: socket server canceled");
                        resolve(null);
                    }, 1000 * 5);
                    console.log("sortResultAwaiters[" + offset + "] set");
                    sortResultAwaiters[offset] = (sortResult4LSE) => {
                        clearTimeout(cancelTask);
                        resolve(sortResult4LSE);
                    };
                }).then((sortResult4LSE) => {
                    if (sortResult4LSE) {
                        delete sortResultAwaiters[offset];
                        console.log("AiX: socket server send");
                        s.write(JSON.stringify(sortResult4LSE));
                    } else {
                        sortResultAwaiters[offset] = "canceled";
                        console.log("AiX: socket server no result");
                        s.write("-");
                    }
                });
            });
        });

        server.on("close", () => {
            console.log("AiX: socket server closed.");
        });

        server.on("error", (e) => {
            console.log(e);
        });

        server.listen(19919, "localhost");
        console.log("AiX: socket server started.");

        const localPort = 19919; // (server.address() as net.AddressInfo).port;
        console.log("AiX: socket server listen on " + localPort);
        if (mspythonExtension.isActive) {
            loadLanguageServerExtension(localPort);
        } else {
            mspythonExtension.activate().then(() => {
                loadLanguageServerExtension(localPort);
            }, (reason) => {
                console.log("AiX: mspythonExtension activate failed reason: " + reason);
            });
        }
    }
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension "autocomplete" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let uuid: string = vscode.workspace.getConfiguration().get("aiXcoder.uuid");
    if (uuid == null || uuid === "") {
        uuid = "vscode-" + Math.floor(Math.random() * 10000);
        vscode.workspace.getConfiguration().update("aiXcoder.uuid", uuid);
    }

    const socketEndpoint: string = vscode.workspace.getConfiguration().get("aiXcoder.socketEndpoint");
    const endpointParts = socketEndpoint.split(":");
    const socketEndpointURL = endpointParts[0];
    const socketEndpointPort = parseInt(endpointParts[1], 10);
    let socket: net.Socket = null;
    const sortResults: {
        [queryUUID: string]: {
            deleter: NodeJS.Timeout,
            value: SortResult | null,
            resolver: null | ((value: SortResult) => void),
        },
    } = {};
    const onConnected = () => {
        console.log("mina: connected");
        const a = JSON.stringify({ type: MessageType.login, data: uuid });
        console.log("mina send:" + a);
        socket.write(a);
    };
    const onData = function(rawdata) {
        console.log("mina: Received: " + rawdata);
        const data: Message = JSON.parse(rawdata);
        if (data.type === MessageType.active) {
            const a = JSON.stringify({ type: MessageType.active, data: uuid });
            console.log("mina send:" + a);
            socket.write(a);
        } else if (data.type === MessageType.sort) {
            const json = JSON.parse(data.data);
            const list = [];
            for (const [prob, word] of json.list) {
                list.push({ word, prob });
            }
            const sortResult = {
                queryUUID: json.queryUUID,
                list,
            };
            if (sortResults[json.queryUUID] == null) {
                sortResults[json.queryUUID] = {
                    deleter: null,
                    value: sortResult,
                    resolver: null,
                };
            } else {
                clearTimeout(sortResults[json.queryUUID].deleter);
                sortResults[json.queryUUID].value = sortResult;
                if (sortResults[json.queryUUID].resolver) {
                    sortResults[json.queryUUID].resolver(sortResult);
                }
            }
            sortResults[json.queryUUID].deleter = setTimeout(() => {
                delete sortResults[json.queryUUID];
            }, 10 * 1000);
        }
    };
    const connectSocket = function() {
        return new Promise((resolve, reject) => {
            console.log("Connection closed, reconnecting");
            socket = new net.Socket();
            socket.connect(socketEndpointPort, socketEndpointURL, () => {
                resolve();
                onConnected();
            });
            socket.on("data", onData);
            socket.on("close", () => {
                socket = null;
            });
        });
    };
    connectSocket();

    let lastText = "";
    let lastPromise = null;
    let lastFetchTime = 0;
    let lastQueryUUID = 0;

    function fetch(ext: string, text: string, remainingText: string) {
        const proxyUrl: string = vscode.workspace.getConfiguration().get("http.proxy");
        const proxyAuth: string = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
        const proxyStrictSSL: string = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
        const endpoint: string = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");

        let host = proxyUrl || endpoint.substring(endpoint.indexOf("://") + 3);
        if (host.indexOf("/") >= 0) {
            host = host.substr(0, host.indexOf("/"));
        }
        if (lastText === text && lastPromise != null) {
            return { body: lastPromise, queryUUID: lastQueryUUID, remote: false };
        } else {
            console.log("send request");
            lastText = text;
            lastFetchTime = new Date().getTime();
            const queryUUID = Math.floor(Math.random() * 10000);
            lastQueryUUID = queryUUID;
            lastPromise = request({
                method: "post",
                url: endpoint + "predict",
                headers: {
                    "Proxy-Authorization": proxyAuth,
                },
                proxy: proxyUrl,
                strictSSL: proxyStrictSSL,
                form: {
                    text,    // 这个是输入的内容，暂时先用p来代替
                    ext,
                    uuid,
                    fileid: "testfile",
                    project: "testproj",
                    remaining_text: remainingText,
                    queryUUID: lastQueryUUID,
                    sort: 1,
                },
                timeout: 2000,
            }).catch((err) => {
                console.log(err);
                if (lastQueryUUID === queryUUID) {
                    lastQueryUUID = null;
                    lastPromise = null;
                }
            });
            return { body: lastPromise, queryUUID, remote: true };
        }
    }

    const supported = [{ language: "java", model: "java(Java)" }, { language: "python", model: "python(Python)" }];
    for (const { language, model } of supported) {
        context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language, scheme: "file" }, {
            async provideCompletionItems(): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
                console.log("=====================");
                try {
                    if (socket == null) {
                        await connectSocket();
                    }
                    const { text, remainingText, offsetID } = getReqText();
                    const { body, queryUUID, remote } = fetch(model, text, remainingText);

                    let sortP: Promise<SortResult>;
                    if (remote) {
                        console.log("remote result");
                        sortP = new Promise((resolve, reject) => {
                            const rj = setTimeout(() => {
                                console.log("sort time out");
                                resolve(null);
                            }, 2000);
                            const sortResolve = (r: SortResult) => {
                                clearTimeout(rj);
                                resolve(r);
                            };

                            sortResults[queryUUID] = {
                                deleter: null,
                                value: null,
                                resolver: sortResolve,
                            };
                        });
                    } else {
                        console.log("local result");
                        const r = sortResults[queryUUID] ? sortResults[queryUUID].value  : null;

                        sortP = Promise.resolve(r || {
                            queryUUID: "",
                            list: [],
                        });
                    }

                    const fetchBody = await body;
                    console.log("get request " + (new Date().getTime() - lastFetchTime));
                    console.log(fetchBody);
                    if (fetchBody === "") { return []; }
                    let strLabels = formatResData(fetchBody, getInstance(language));
                    console.log("predict result:");
                    console.log(strLabels);
                    const results = await sortP;
                    console.log("mina result:");
                    console.log(results);
                    if (mspythonExtension) {
                        console.log("AiX: resolve " + offsetID + " " + sortResultAwaiters[offsetID]);
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
                    console.log("provideCompletionItems ends");
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

    function getReqText() {
        const selectionStart = vscode.window.activeTextEditor.selection.start;
        const offset = vscode.window.activeTextEditor.document.offsetAt(selectionStart);
        const lineEnd = vscode.window.activeTextEditor.document.lineAt(selectionStart).range.end;
        const lineEndOffset = vscode.window.activeTextEditor.document.offsetAt(lineEnd);
        const text = vscode.window.activeTextEditor.document.getText();   // 获取编辑器上面已有的文字
        return {
            text: text.substring(0, offset),
            remainingText: text.substring(offset, lineEndOffset),
            offsetID: (selectionStart.line + 1) * (selectionStart.character + 1),
        };
    }

    // 处理返回的值，最终变成放入提示框的内容
    function formatResData(json: string, langUtil: LangUtil): vscode.CompletionItem[] {
        const results = JSON.parse(json);
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
}

// this method is called when your extension is deactivated
export function deactivate() {

}
