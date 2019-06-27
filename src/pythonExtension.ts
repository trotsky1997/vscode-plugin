import * as path from "path";
import * as vscode from "vscode";
import { fetchResults, formatSortData, JSHooker, mergeSortResult, sendPredictTelemetry, showInformationMessage, SortResult, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export function activatePython(context: vscode.ExtensionContext) {
    const mspythonExtension = vscode.extensions.getExtension("ms-python.python");
    const sortResultAwaiters: {
        [key: string]: any,
        requesting: boolean,
        incomingResult: Promise<SortResult>,
        workingDocument: vscode.TextDocument,
    } = {
        requesting: false,
        incomingResult: null,
        workingDocument: null,
    };

    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;

        if (mspythonExtension) {
            log("AiX: ms-python.python detected");
            const distjsPath = path.join(mspythonExtension.extensionPath, "out", "client", "extension.js");
            await JSHooker("/**AiXHooked-5**/", distjsPath, mspythonExtension, "python.reload", "python.fail", (distjs) => {
                // inject ms engine
                const middlewareStart = SafeStringUtil.indexOf(distjs, "middleware:{provideCompletionItem:(");
                const middlewareParamEnd = SafeStringUtil.indexOf(distjs, ")", middlewareStart + "middleware:{provideCompletionItem:(".length);
                const middlewareLastParamStart = SafeStringUtil.lastIndexOf(distjs, ",", middlewareParamEnd) + 1;
                const nextUglyName = SafeStringUtil.substring(distjs, middlewareLastParamStart, middlewareParamEnd);
                const nextCallStart = SafeStringUtil.indexOf(distjs, `,${nextUglyName}(`, middlewareLastParamStart) + 1;
                const nextCallEnd = SafeStringUtil.indexOf(distjs, ")", nextCallStart) + 1;
                const nextCall = SafeStringUtil.substring(distjs, nextCallStart, nextCallEnd);
                const handleResultCode = (r: string) => `const api = require(\"vscode\").extensions.getExtension(\"ms-python.python\").exports;if(api.aixhook){await api.aixhook(${r});}`;
                distjs = SafeStringUtil.substring(distjs, 0, nextCallStart) + `new Promise(async (resolve, reject)=>{const rr=${nextCall};${handleResultCode("rr")}resolve(rr);})` + SafeStringUtil.substring(distjs, nextCallEnd);

                // inject jedi engine
                const pythonCompletionItemProviderSignature = "t.PythonCompletionItemProvider=l}";
                const pythonCompletionItemProviderEnd = SafeStringUtil.indexOf(distjs, pythonCompletionItemProviderSignature);
                const provideCompletionItemsStart = SafeStringUtil.lastIndexOf(distjs, "async provideCompletionItems(", pythonCompletionItemProviderEnd);
                const provideCompletionItemsEnd = SafeStringUtil.indexOf(distjs, "return r}", provideCompletionItemsStart);
                distjs = SafeStringUtil.substring(distjs, 0, provideCompletionItemsEnd) + handleResultCode("r") + SafeStringUtil.substring(distjs, provideCompletionItemsEnd);
                return distjs;
            });
            mspythonExtension.exports.aixhook = async function(ll) {
                ll = await ll;
                if (ll.items) {
                    ll = ll.items;
                }
                mergeSortResult(ll, await sortResultAwaiters.incomingResult, sortResultAwaiters.workingDocument, STAR_DISPLAY.LEFT);
                return ll;
            };
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
                sortResultAwaiters.requesting = true;
                sortResultAwaiters.workingDocument = document;
                let incomingResultResolver = null;
                sortResultAwaiters.incomingResult = new Promise((resolve, reject) => {
                    incomingResultResolver = resolve;
                });
                const ext = "python(Python)";
                const { longResults, sortResults, offsetID, fetchTime } = await fetchResults(document, position, ext, "python");
                incomingResultResolver(sortResults);
                sortResultAwaiters.requesting = false;

                if (mspythonExtension) {
                    log("AiX: resolve " + offsetID + " " + sortResultAwaiters[offsetID]);
                    if (sortResultAwaiters[offsetID] !== "canceled") {
                        if (sortResultAwaiters[offsetID] == null) {
                            // LSE will go later
                            sortResultAwaiters[offsetID] = sortResults;
                        } else if (typeof sortResultAwaiters[offsetID] === "function") {
                            // LSE went earlier
                            sortResultAwaiters[offsetID](sortResults);
                        }
                    } else {
                        delete sortResultAwaiters[offsetID];
                    }
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
}
