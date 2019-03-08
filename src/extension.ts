'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {
    commands, CompletionItem, CompletionItemKind, Disposable,
    ExtensionContext, languages, Position, Range, TextDocument, Uri, window,
    workspace,
    CancellationToken,
    CompletionContext,
    CompletionList,
    ProviderResult,
} from "vscode";
import Autohint from './autohint';
import { eventNames } from 'cluster';
import { resolve } from 'dns';

var request = require('request');

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    // console.log('Congratulations, your extension "autocomplete" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('java', {
        async provideCompletionItems(document, position, token: CancellationToken, context: CompletionContext): Promise<CompletionItem[] | CompletionList> {
            let result = '';
            // 敲键的时候执行这个
            let strLabel = await new Promise((resolve)=> {
                var proxyUrl = vscode.workspace.getConfiguration().get("http.proxy");
                var proxyAuth = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
                var proxyStrictSSL = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
                var endpoint = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
                var lang = vscode.workspace.getConfiguration().get("aiXcoder.language");
                request({
                    method: "post",
                    url: endpoint + "predict",
                    headers: {
                        "Proxy-Authorization": proxyAuth
                    },
                    proxy: proxyUrl,
                    strictSSL: proxyStrictSSL,
                    form: {
                        "text": vscode.window.activeTextEditor.document.getText(),    // 这个是输入的内容，暂时先用p来代替
                        "current": null,
                        "ext": lang,
                        "uuid": 'vscode',
                        'fileid': 'testfile',
                        'project': 'testproj'
                    }
                }, function (error, response, body) {
                    if (error) console.log(error);
                    if (response && (response.statusCode == 200)) {
                        resolve(formatResData(body));
                    }
                });
            })
            console.log(strLabel);
            // return [{label: strLabel}];    // 好无奈，报错了！ 😭
            return [{label: result}];
        },
        resolveCompletionItem(item: CompletionItem, token: CancellationToken): ProviderResult<CompletionItem> {
            return null;
        }
    }, ".",";",'a','b','c','d','e','f','g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v','w','x','y','z'));

    function getReqText() {
        let text = vscode.window.activeTextEditor.document.getText();   // 获取编辑器上面已有的文字
        return text;
    }

    // 处理返回的值，最终变成放入提示框的内容
    function formatResData(data) {
        let builder = '';
        var data = JSON.parse(data);
        data[0].tokens = data[0].tokens.filter(v => v != '<BREAK>');    // 过滤<BREAK>

        let leftTrim = [];
        let rightTrim = ['if', 'else', 'catch', 'finally', 'for','return', '++', '--', ']', ','];
        let allTrim = ['+=', '-=', '==', '*=', '/=', '**', '%=', '!=', '<>', '||', '&&', ">=", "<=", "&=", "^=", "|=", "<<", ">>", "^|", "->", "::", '*', '%', ':', '}', '{', '<<=', '>>=', '*', '/', '%', '>>>', '<', '>', '?','='];
        let unsureTrim = ['+', '-', ':','<BREAK>'];

        if (data[0].tokens.length > 3) {
            let list = data[0].tokens;
            var position = vscode.window.activeTextEditor.selection.active;
            let indent = vscode.window.activeTextEditor.document.lineAt(position).firstNonWhitespaceCharacterIndex;
            list.forEach((wd,key,arr)=> {
                if(key != list.length - 1) {
                    let nextWd = arr[key + 1];
                     /*
                        将非<ENTER><UNK><null><BREAK>转换成空字符串的左右各加一个空格。但是如果该字符串出现在了一行的最后，不加。
                    */
                    if(/^<.{1,}>$/.test(wd) && (wd != '<ENTER>') && (wd != '<UNK>') && (wd != '<null>') && (wd != '<BREAK>') && (wd != '<str>')) {
                        wd = ' ' + wd;
                        if(nextWd != ';') {
                            wd+= ' ';
                        }
                    }

                     // 加右空格
                    for (var j = 0; j < rightTrim.length; j++) {
                        if (wd == rightTrim[j]) {
                            if (nextWd && nextWd == ';' || nextWd && nextWd == ')') {
                                break;
                            }
                            wd = wd + ' ';
                            break;
                        }
                    }

                    // 加两侧空格
                    for (var j = 0; j < allTrim.length; j++) {
                        if (wd == allTrim[j]) {
                            if (nextWd && nextWd == ';') {
                                break;
                            }
                            wd = ' ' + wd + ' ';
                            break;
                        }
                    }

                    wd = '' ? ' ' + wd : wd;
                    wd = wd.replace(/<str>([\w|\W]+)/,function(a,a1) {
                        return '"' + a1 + '"';
                    });
                }
               
                if (wd == "<ENTER>") {
                    builder += "\r";
                    builder += "\n";
                    for (var i = 0; i < indent; i++) builder += " ";     // enter换行
                }
                else if (wd == "<IND>") {
                    indent += 4;
                    builder += "    ";  // ind加缩进
                }
                else if (wd == "<UNIND>") {    // unind减缩进
                    if (builder.length >= 4 && builder.substring(builder.length - 4) == "    ") {
                        builder = builder.substring(0, builder.length - 4);
                    }
                } 
                else {
                    // builder += wd + " ";   // 每两个返回值之间加个空格
                    builder += wd;
                }
            })
        }
        return builder;
    }
}

// this method is called when your extension is deactivated
export function deactivate() {

}