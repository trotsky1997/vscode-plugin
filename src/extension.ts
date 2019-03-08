"use strict";
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";

const request = require("request-promise");
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension "autocomplete" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    let lastText = "";
    let lastPromise = null;
    let lastFetchTime = 0;

    async function fetch() {
        const proxyUrl: string = vscode.workspace.getConfiguration().get("http.proxy");
        const proxyAuth: string = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
        const proxyStrictSSL: string = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
        const endpoint: string = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
        const lang: string = vscode.workspace.getConfiguration().get("aiXcoder.language");
        const text = getReqText();

        let host = proxyUrl || endpoint.substring(endpoint.indexOf("://") + 3);
        if (host.indexOf("/") >= 0) {
            host = host.substr(0, host.indexOf("/"));
        }
        if (lastText === text && lastPromise != null) {
            return lastPromise;
        } else {
            console.log("send request");
            lastText = text;
            lastFetchTime = new Date().getTime();
            const thisFetchTime = lastFetchTime;
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
                    ext: lang,
                    uuid: "vscode",
                    fileid: "testfile",
                    project: "testproj",
                    prob_th_rnn_t: 0,
                    prob_th_rnn: 0,
                },
            });
            const body: string = await lastPromise;
            if (thisFetchTime < lastFetchTime) {
                // expire
                return "";
            }
            console.log("get request " + (new Date().getTime() - lastFetchTime));
            console.log(body);
            return body;
        }
    }

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider("java", {
        async provideCompletionItems(): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            const body = await fetch();
            const strLabels = formatResData(body);
            return strLabels;
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    }, ".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "="));

    function getReqText() {
        const selectionStart = vscode.window.activeTextEditor.selection.start;
        const offset = vscode.window.activeTextEditor.document.offsetAt(selectionStart);
        const text = vscode.window.activeTextEditor.document.getText();   // 获取编辑器上面已有的文字
        return text.substring(0, offset);
    }

    const rightTrim = ["if", "else", "catch", "finally", "for", "return", "++", "--", "]", ","];
    const allTrim = ["+=", "-=", "==", "*=", "/=", "**", "%=", "!=", "<>", "||", "&&", ">=", "<=", "&=", "^=", "|=", "<<", ">>", "^|", "->", "::", "*", "%", ":", "}", "{", "<<=", ">>=", "*", "/", "%", ">>>", "<", ">", "?", "="];

    // 处理返回的值，最终变成放入提示框的内容
    function formatResData(json: string): vscode.CompletionItem[] {
        const data = JSON.parse(json);
        const completions = [];
        for (const item of data) {
            let builder = "";
            const list: string[] = item.tokens.filter((v: string) => v !== "<BREAK>");    // 过滤<BREAK>
            const position = vscode.window.activeTextEditor.selection.active;
            let indent = vscode.window.activeTextEditor.document.lineAt(position).firstNonWhitespaceCharacterIndex;
            list.forEach((wd, key, arr) => {
                if (key !== list.length - 1) {
                    const nextWd = arr[key + 1];
                    /*
                       将非<ENTER><UNK><null><BREAK>转换成空字符串的左右各加一个空格。但是如果该字符串出现在了一行的最后，不加。
                   */
                    if (/^<.{1,}>$/.test(wd) && (wd !== "<ENTER>") && (wd !== "<UNK>") && (wd !== "<null>") && (wd !== "<BREAK>") && (wd !== "<str>")) {
                        wd = " " + wd;
                        if (nextWd !== ";") {
                            wd += " ";
                        }
                    }

                    if (/^[a-zA-Z$_0-9]+$/.test(wd) && /^[a-zA-Z$_0-9]+$/.test(nextWd)) {
                        wd += " ";
                    }

                    // 加右空格
                    for (const rightTrimWord of rightTrim) {
                        if (wd === rightTrimWord) {
                            if (nextWd && nextWd === ";" || nextWd && nextWd === ")") {
                                break;
                            }
                            wd = wd + " ";
                            break;
                        }
                    }

                    // 加两侧空格
                    for (const allTrimWord of allTrim) {
                        if (wd === allTrimWord) {
                            if (nextWd && nextWd === ";") {
                                break;
                            }
                            wd = " " + wd + " ";
                            break;
                        }
                    }

                    wd = "" ? " " + wd : wd;
                    wd = wd.replace(/<str>([\w|\W]+)/, function(a, a1) {
                        return '"' + a1 + '"';
                    });
                }

                if (wd === "<ENTER>") {
                    builder += "\r";
                    builder += "\n";
                    for (let i = 0; i < indent; i++) { builder += " "; }     // enter换行
                } else if (wd === "<IND>") {
                    indent += 4;
                    builder += "    ";  // ind加缩进
                } else if (wd === "<UNIND>") {    // unind减缩进
                    if (builder.length >= 4 && builder.substring(builder.length - 4) === "    ") {
                        builder = builder.substring(0, builder.length - 4);
                    }
                } else {
                    // builder += wd + " ";   // 每两个返回值之间加个空格
                    builder += wd;
                }
            });
            completions.push({
                label: item.current + builder,
                insertString: builder,
            });
        }
        return completions;
    }
}

// this method is called when your extension is deactivated
export function deactivate() {

}
