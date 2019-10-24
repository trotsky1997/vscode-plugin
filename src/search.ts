import { exec } from "child_process";
import * as vscode from "vscode";
import { showInformationMessage } from "./extension";
import { localize } from "./i18n";

function getWebviewContent(searchUrl: string) {
    return `<!DOCTYPE html>
    <html style="display: block; width: 100%; height: 100%;">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="height: 100%; margin: 0;box-sizing: border-box">
    <iframe id="aix" src="${searchUrl}" style="display: block; width: 100%; height: 100%; border: none; margin: 0;"></iframe>
    </body>
    <script>
    const vscode = acquireVsCodeApi();
    vscode.setState("${searchUrl}");
    </script>
    </html>`;
}

export class AiXSearchSerializer implements vscode.WebviewPanelSerializer {
    public async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
      // `state` is the state persisted using `setState` inside the webview
      console.log(`Got state: ${state}`);

      // Restore the content of our webview.
      //
      // Make sure we hold on to the `webviewPanel` passed in here and
      // also restore any event listeners we need on it.
      webviewPanel.webview.html = getWebviewContent(state);
      searchPanel = webviewPanel;
    }
  }

const languageId2Model = {
    python: { area: "python(Python)", language: "python" },
    java: { area: "java(Java)", language: "java" },
    c: { area: "cpp(Cpp)", language: "cpp" },
    cpp: { area: "cpp(Cpp)", language: "cpp" },
};

let msgsearchfirsttimeShown = false;
let searchPanel: vscode.WebviewPanel = null;

export async function doSearch(context: vscode.ExtensionContext, uri: vscode.Uri) {
    if (!msgsearchfirsttimeShown) {
        showInformationMessage(localize("msgsearchfirsttime"), localize("openSetting")).then((selected) => {
            if (selected === localize("openSetting")) {
                vscode.commands.executeCommand("workbench.action.openSettings", "aiXcoder: search");
            }
        });
    }
    msgsearchfirsttimeShown = true;
    let editor: vscode.TextEditor;
    if (uri == null) {
        editor = vscode.window.activeTextEditor;
    } else {
        const d = await vscode.workspace.openTextDocument(uri);
        editor = vscode.window.visibleTextEditors.find((e) => {
            return e.document === d;
        });
    }
    const document = editor.document;
    if (editor.selection) {
        let selected = document.getText(editor.selection);
        if (editor.selection.isEmpty) {
            selected = document.getText(document.getWordRangeAtPosition(editor.selection.end));
        }
        console.log("Search: " + selected);
        let searchEndpoint = vscode.workspace.getConfiguration().get("aiXcoder.searchEndpoint") as string;
        if (!searchEndpoint.endsWith("/")) {
            searchEndpoint += "/";
        }
        const { area, language } = languageId2Model[document.languageId];
        const searchUrl = searchEndpoint + `?c=${encodeURIComponent(selected)}&area=${area}&language=${language}&from=vscode&theme=Dark`;
        if (!vscode.workspace.getConfiguration().get("aiXcoder.searchIntegratedWindow")) {
            if (vscode.workspace.getConfiguration().get("aiXcoder.searchDefaultBrowser") === "<default browser>") {
                await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(searchUrl));
            } else {
                exec(vscode.workspace.getConfiguration().get("aiXcoder.searchDefaultBrowser") + " " + searchUrl);
            }
        } else {
            if (searchPanel == null) {
                searchPanel = vscode.window.createWebviewPanel(
                    "aixsearch", // Identifies the type of the webview. Used internally
                    "aiXcoder Search", // Title of the panel displayed to the user
                    vscode.ViewColumn.Two, // Editor column to show the new webview panel in.
                    {
                        enableScripts: true,
                        enableCommandUris: true,
                    }, // Webview options. More on these later.
                );
                searchPanel.onDidDispose(() => {
                    searchPanel = null;
                });
                searchPanel.webview.onDidReceiveMessage((msg) => {
                    console.log(msg);
                }, undefined, context.subscriptions);
            } else {
                searchPanel.reveal();
            }
            searchPanel.webview.html = getWebviewContent(searchUrl);
        }
    }

}
