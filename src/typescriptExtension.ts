import * as vscode from "vscode";
import { fetchResults, formatSortData, sendPredictTelemetry } from "./extension";
import { getInstance } from "./lang/commons";
import log from "./logger";

export function activateTypeScript(context: vscode.ExtensionContext) {
    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;
    }

    const jsprovider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.javascript") as string;
                const { longResults, sortResults, fetchTime } = await fetchResults(document, position, ext, "js");
                const sortLabels = formatSortData(sortResults, getInstance("js"), document);
                longResults.push(...sortLabels);
                sendPredictTelemetry(fetchTime, longResults);
                log("provideCompletionItems Javascript ends");
                return longResults;
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const tsprovider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.typescript") as string;
                const { longResults, sortResults, fetchTime } = await fetchResults(document, position, ext, "ts");
                const sortLabels = formatSortData(sortResults, getInstance("ts"), document);
                longResults.push(...sortLabels);
                sendPredictTelemetry(fetchTime, longResults);
                log("provideCompletionItems TypeScript ends");
                return longResults;
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const triggerCharacters = [".", "a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "=", "_", "$"];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "file" }, jsprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "untitled" }, jsprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "typescript", scheme: "file" }, tsprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "typescript", scheme: "untitled" }, tsprovider, ...triggerCharacters));
    return {
        async aixHook(): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            try {
                return new vscode.CompletionList([], true);
            } catch (e) {
                log(e);
            }
        },
    };
}
