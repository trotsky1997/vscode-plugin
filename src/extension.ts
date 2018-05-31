'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

import {
    commands, CompletionItem, CompletionItemKind, Disposable,
    ExtensionContext, languages, Position, Range, TextDocument, Uri, window,
    workspace,
} from "vscode";

import Autohint from './autohint';
import { eventNames } from 'cluster';

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "autocomplete" is now active!');

    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json

    var autohint = new Autohint();

    autohint.setEditor(vscode.window.activeTextEditor);

    context.subscriptions.push(vscode.commands.registerCommand('type', (args)=>{
        if (/[^\s]/.test(args.text))
            autohint.setShould(true);
        vscode.commands.executeCommand('default:type', args);
    }));

    vscode.window.onDidChangeTextEditorSelection(event=>{
        if (autohint.cursorState==0) {
            autohint.remove(autohint.should?function() {
                autohint.add(false);
            }:null);
            return;
        }
        else if (autohint.cursorState==2) {
            autohint.cursorState = 0;
        }
        if (autohint.should) {
            autohint.add(false);
        }
    })

    context.subscriptions.push(vscode.commands.registerCommand('extension.test', ()=>{

        autohint.insert();

    }))

}

// this method is called when your extension is deactivated
export function deactivate() {

}