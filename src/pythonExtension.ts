import * as path from "path";
import * as vscode from "vscode";
import { TelemetryType } from "./API";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetryLong, sendPredictTelemetryShort, showInformationMessage, SortResultEx, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export function activatePython(context: vscode.ExtensionContext) {
    const mspythonExtension = vscode.extensions.getExtension("ms-python.python");
    const syncer = new Syncer<SortResultEx>();
    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;

        if (mspythonExtension) {
            log("AiX: ms-python.python detected");
            const distjsPath = path.join(mspythonExtension.extensionPath, "out", "client", "extension.js");
            await JSHooker("/**AiXHooked-10**/", distjsPath, mspythonExtension, "python.reload", "python.fail", (distjs) => {
                // inject ms engine
                const handleResultCode = (r: string) => `const aix = require(\"vscode\").extensions.getExtension("${myID}");const api = aix && aix.exports;if(api && api.aixhook){r = await api.aixhook("python",${r},$1,$2,$3,$4);}`;
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
                    syncer.put(offsetID, { ...sortResults, ext, fetchTime });
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("python"), document, ext);
                    longResults.push(...sortLabels);
                }
                if (!token.isCancellationRequested) {
                    sendPredictTelemetryLong(ext, fetchTime, longResults);
                }
                log("provideCompletionItems ends");
                return new vscode.CompletionList(longResults, true);
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const triggerCharacters = [".", "="];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "python", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "python", scheme: "untitled" }, provider, ...triggerCharacters));
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            try {
                const { offsetID } = getReqText(document, position);
                const sortResults = await syncer.get(offsetID);
                const items = Array.isArray(ll) ? ll : ll.items;
                const { ext, fetchTime } = sortResults;

                mergeSortResult(items, sortResults, document, STAR_DISPLAY.LEFT);
                if (!token.isCancellationRequested) {
                    sendPredictTelemetryShort(ext, fetchTime, sortResults);
                }
                return new vscode.CompletionList(items, true);
            } catch (e) {
                log(e);
            }
        },
    };
}
