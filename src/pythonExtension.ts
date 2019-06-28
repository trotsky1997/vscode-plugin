import * as path from "path";
import * as vscode from "vscode";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetry, showInformationMessage, SortResult, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export function activatePython(context: vscode.ExtensionContext) {
    const mspythonExtension = vscode.extensions.getExtension("ms-python.python");
    const syncer = new Syncer<SortResult>();
    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;

        if (mspythonExtension) {
            log("AiX: ms-python.python detected");
            const distjsPath = path.join(mspythonExtension.extensionPath, "out", "client", "extension.js");
            await JSHooker("/**AiXHooked-9**/", distjsPath, mspythonExtension, "python.reload", "python.fail", (distjs) => {
                // inject ms engine
                const handleResultCode = (r: string) => `const api = require(\"vscode\").extensions.getExtension("${myID}").exports;if(api && api.aixhook){r = await api.aixhook("python",${r},$1,$2,$3,$4);}`;
                const replaceTarget = `middleware:{provideCompletionItem:async($1,$2,$3,$4,$5)=>{$6;let rr=$7;${handleResultCode("rr")};return rr;}`;
                distjs = distjs.replace(/middleware:{provideCompletionItem:\((\w+),(\w+),(\w+),(\w+),(\w+)\)=>\((.+?),(\5\(\1,\2,\3,\4\))\)/, replaceTarget);

                // inject jedi engine
                const pythonCompletionItemProviderSignature = "t.PythonCompletionItemProvider=l}";
                const pythonCompletionItemProviderEnd = SafeStringUtil.indexOf(distjs, pythonCompletionItemProviderSignature);
                const provideCompletionItemsStart = SafeStringUtil.lastIndexOf(distjs, "async provideCompletionItems(", pythonCompletionItemProviderEnd);
                const provideCompletionItemsEnd = SafeStringUtil.indexOf(distjs, "return r}", provideCompletionItemsStart);
                distjs = SafeStringUtil.substring(distjs, 0, provideCompletionItemsEnd) + handleResultCode("r") + SafeStringUtil.substring(distjs, provideCompletionItemsEnd);
                return distjs;
            });
        } else {
            showInformationMessage("mspythonExtension.install", "action.install").then((selection) => {
                if (selection === localize("action.install")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-python.python"));
                }
            });
        }
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.python") as string;
                const { longResults, sortResults, offsetID, fetchTime } = await fetchResults(document, position, ext, "python");

                if (mspythonExtension) {
                    syncer.put(offsetID, sortResults);
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("python"), document);
                    longResults.push(...sortLabels);
                }
                sendPredictTelemetry(fetchTime, longResults);
                log("provideCompletionItems ends");
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
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext, ext: string): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            if (ext === "basic" && !vscode.workspace.getConfiguration("php").get("suggest.basic", true)) {
                return ll;
            }
            try {
                const { offsetID } = getReqText(document, position);
                const sortResults = await syncer.get(offsetID);
                const items = Array.isArray(ll) ? ll : ll.items;

                mergeSortResult(items, sortResults, document, STAR_DISPLAY.LEFT);
                return new vscode.CompletionList(items, true);
            } catch (e) {
                log(e);
            }
        },
    };
}
