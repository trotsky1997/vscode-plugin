'use strict';

import * as vscode from 'vscode';
import { TextEditor, TextEditorDecorationType, Range } from 'vscode';
var request = require('request');

export default class Autohint {
    list: Array<string>;
    completeStr: string;
    completeLen: number;
    decoration: TextEditorDecorationType;
    range: Range;
    editor: TextEditor;
    should: boolean;
    cursorState: number; // 0-should delete; 1-should not; 2-not and change to 0
    autohint: Autohint;
    req;

    constructor() {
        this.autohint = this;
        this.editor = null;
        this.req = null;
        this.reset();
    }

    private reset(): void {
        this.list = new Array();
        this.completeStr = null;
        this.decoration = null;
        this.range = null;
        this.should = false;
        this.completeLen = 0;
        this.cursorState = 0;
    }

    public setEditor(_editor: TextEditor): void {
        this.remove();
        this.editor = _editor;
    }

    public remove(f?): void {
        if (this.editor == null) {
            if (f) f();
            return;
        }
        if (this.decoration != null)
            this.decoration.dispose();
        if (this.completeStr != null) {
            var text = this.editor.document.getText();
            var index = text.indexOf(this.completeStr);
            if (index >= 0) {
                this.editor.edit(builder => {
                    builder.delete(new Range(this.editor.document.positionAt(index), this.editor.document.positionAt(index + this.completeStr.length)));
                }).then(e => {
                    if (f) f();
                }, h => { })
                this.reset();
                return;
            }
        }
        this.reset();
        if (f) f();
    }

    public setShould(should: boolean): void {
        this.should = should;
    }

    public add(request: boolean): void {
        this.should = false;
        if (this.editor == null) {
            return;
        }
        if (this.req != null) {
            this.req.abort();
            this.req = null;
        }
        if (!this.editor.selection.isEmpty)
            return;
        var text = this.editor.document.getText();
        var position = this.editor.selection.active;

        if (request || this.list.length <= 3) {
            var prefix = text.substring(0, this.editor.document.offsetAt(position));
            this.predict(prefix, null);
            return;
        }

        var indent = this.editor.document.lineAt(position).firstNonWhitespaceCharacterIndex;
        var temp = this.list.slice();

        var builder = "", eol = this.editor.document.eol;
        this.list.forEach(wd => {
            if (wd == "<ENTER>") {
                if (eol == 2) builder += "\r";
                builder += "\n";
                for (var i = 0; i < indent; i++) builder += " ";
            }
            else if (wd == "<IND>") {
                indent += 4;
                builder += "    ";
            }
            else if (wd == "<UNIND>") {
                if (builder.length >= 4 && builder.substring(builder.length - 4) == "    ") {
                    builder = builder.substring(0, builder.length - 4);
                }
            }
            else {
                builder += wd + " ";
            }
        })

        this.completeStr = builder + "$";
        this.setComplete();

        this.editor.edit(builder => {
            this.cursorState = 1;
            builder.insert(position, this.completeStr);
        }).then(e => {
            this.editor.selection = new vscode.Selection(position, position);
            this.range = new Range(position, this.editor.document.positionAt(this.editor.document.offsetAt(position) + this.completeStr.length));
            this.decoration = vscode.window.createTextEditorDecorationType({ cursor: 'crosshair', backgroundColor: 'rgba(128,128,128,0.3)' });
            this.editor.setDecorations(this.decoration, [this.range]);
            this.cursorState = 2;
        }, h => { this.reset(); });
    }

    private setComplete(): void {
        if (this.completeStr.charAt(0) == '\r' || this.completeStr.charAt(0) == '\n' || this.completeStr.charAt(0) == ' ') {
            this.completeLen = 0;
            while (this.completeLen < this.completeStr.length &&
                (this.completeStr.charAt(this.completeLen) == '\r' || this.completeStr.charAt(this.completeLen) == '\n' || this.completeStr.charAt(this.completeLen) == ' '))
                this.completeLen++;
        }
        else {
            this.completeLen = this.list[0].length;
            if (this.list.length > 1 && !/^[.({[,:)\]}]$/.test(this.list[1]) && !(this.list[1] == '<ENTER>' || this.list[1] == '<IND>' || this.list[1] == '<UNIND>')
                && !/^[.({[:]$/.test(this.list[0]))
                this.completeLen++;
            if (this.list.length > 1 && this.list[1] == '[' && !/^\w$/.test(this.list[0].charAt(this.list[0].length - 1)))
                this.completeLen++;
        }
    }

    public insert(): void {
        if (this.editor == null || this.completeStr == null || this.completeLen == 0) {
            return;
        }
        if (this.editor.selection.isEmpty) {
            var autohint = this.autohint;
            var list = this.list;
            var position = this.editor.selection.active;
            /*
            this.remove(()=>{
                autohint.editor.edit(builder=>{
                    builder.insert(position, toInsert);
                }).then(e=>{
                    if (list[0]=='<ENTER>' || list[0]=='<IND>' || list[0]=='<UNIND>') {
                        while (list.length>0 && (list[0]=='<ENTER>' || list[0]=='<IND>' || list[0]=='<UNIND>'))
                            list.shift();
                    }
                    else {
                        list.shift();
                    }
                    autohint.list = list;
                    autohint.add(false);
                })
            });
            */

            if (list[0] == '<ENTER>' || list[0] == '<IND>' || list[0] == '<UNIND>') {
                while (list.length > 0 && (list[0] == '<ENTER>' || list[0] == '<IND>' || list[0] == '<UNIND>'))
                    list.shift();
            }
            else {
                list.shift();
            }

            autohint.cursorState = 1;

            var newOffset = this.editor.document.offsetAt(position) + this.completeLen;
            autohint.editor.selection = new vscode.Selection(this.editor.document.positionAt(newOffset), this.editor.document.positionAt(newOffset));
            this.completeStr = this.completeStr.substring(this.completeLen);

            var after = () => {
                this.setComplete();
                autohint.cursorState = 2;
                autohint.range = new Range(autohint.editor.selection.start, this.editor.document.positionAt(this.editor.document.offsetAt(autohint.editor.selection.start) + this.completeStr.length));
                if (autohint.decoration != null) autohint.decoration.dispose();
                autohint.decoration = vscode.window.createTextEditorDecorationType({ cursor: 'crosshair', backgroundColor: 'rgba(128,128,128,0.3)' });
                autohint.editor.setDecorations(this.decoration, [this.range]);
            }

            if (this.completeStr.charAt(0) == ' ') {
                this.completeStr = this.completeStr.substring(1);
                autohint.editor.edit(builder => {
                    builder.delete(new vscode.Range(this.editor.document.positionAt(newOffset), this.editor.document.positionAt(newOffset + 1)));
                }).then(e => {
                    after();
                    autohint.cursorState = 0;
                });
                return;
            }
            after();
        }
    }

    public predict(prefix: String, word: String): void {
        var q1 = 0, q2 = 0;
        for (var i = 0; i < prefix.length; i++) {
            var c = prefix.charAt(i);
            if (c == "\"") q1++;
            if (c == "'") q2++;
        }
        if (q1 % 2 != 0 || q2 % 2 != 0) {
            this.reset();
            return;
        }

        if (this.req != null) {
            this.req.abort();
            this.req = null;
        }

        var autohint = this.autohint;
        var proxyUrl = vscode.workspace.getConfiguration().get("http.proxy");
        var proxyAuth = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
        var proxyStrictSSL = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
        
        this.req = request({
            method: "post",
            url: "http://www.nnthink.com:8787/predict",
            headers: {
                "Proxy-Authorization": proxyAuth
            },
            proxy: proxyUrl,
            strickSSL: proxyStrictSSL,
            form: {
                "text": prefix,
                "current": null
            }
        }, function (error, response, body) {
            autohint.req = null;
            if (response && (response.statusCode == 200)) {
                var data = JSON.parse(body);
                autohint.list = data[0].tokens;
                autohint.list = autohint.list.filter(v => v != '<BREAK>');
                if (autohint.list.length > 3)
                    autohint.add(false);
            }
        });
    }

}


