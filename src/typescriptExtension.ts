import * as path from "path";
import * as vscode from "vscode";
import { TelemetryType } from "./API";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetryLong, sendPredictTelemetryShort, SortResultEx, STAR_DISPLAY } from "./extension";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";

export async function activateTypeScript(context: vscode.ExtensionContext) {
    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;
    }
    const syncer = new Syncer<SortResultEx>();
    const mstsId = "vscode.typescript-language-features";
    const msts = vscode.extensions.getExtension(mstsId);
    let hooked = false;
    if (msts) {
        log(`AiX: ${mstsId} detected`);
        const distjsPath = path.join(msts.extensionPath, "dist", "extension.js");
        hooked = await JSHooker("/**AiXHooked-1**/", distjsPath, msts, "js.reload.msts", "js.fail.msts", (distjs) => {
            const handleResultCode = (r: string) => `const aix = require(\"vscode\").extensions.getExtension("${myID}");const api = aix && aix.exports; if(api && api.aixhook){${r}=await api.aixhook(\"typescript\",${r},$1,$2,$3,$4);}`;
            const newProvideCompletionItems = `async provideCompletionItems($1,$2,$3,$4){let rr=await this.provideCompletionItems2($1,$2,$3,$4);${handleResultCode("rr")};return rr;}`;
            distjs = distjs.replace(/async provideCompletionItems\((\w+),\s*(\w+),\s*(\w+),\s*(\w+)\)\s*{/, `${newProvideCompletionItems}async provideCompletionItems2($1,$2,$3,$4){`);
            return distjs;
        });
    }

    let lastTime = 0;
    const jsprovider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            if (Date.now() - lastTime < 100) {
                return [];
            }
            lastTime = Date.now();
            await _activate();
            log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.javascript") as string;
                const theFetchResults = await fetchResults(document, position, ext, "js", STAR_DISPLAY.LEFT);
                const { sortResults, offsetID, fetchTime } = theFetchResults;
                const { longResults } = theFetchResults;
                if (msts && hooked) {
                    syncer.put(offsetID, { ...sortResults, ext, fetchTime });
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("js"), document, ext);
                    longResults.push(...sortLabels);
                }
                if (!token.isCancellationRequested) {
                    sendPredictTelemetryLong(ext, fetchTime, longResults);
                }
                log("provideCompletionItems Javascript ends " + longResults.length);
                return new vscode.CompletionList(longResults, true);
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const tsprovider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            if (Date.now() - lastTime < 100) {
                return [];
            }
            await _activate();
            log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.typescript") as string;
                const theFetchResults = await fetchResults(document, position, ext, "ts", STAR_DISPLAY.LEFT);
                const { sortResults, offsetID, fetchTime } = theFetchResults;
                const { longResults } = theFetchResults;
                if (msts && hooked) {
                    syncer.put(offsetID, { ...sortResults, ext, fetchTime });
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("ts"), document, ext);
                    longResults.push(...sortLabels);
                }
                if (!token.isCancellationRequested) {
                    sendPredictTelemetryLong(ext, fetchTime, longResults);
                }
                log("provideCompletionItems TypeScript ends " + longResults.length);
                return new vscode.CompletionList(longResults, true);
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    const triggerCharacters = [".", "/", "@", "<", "=", "_", "$"];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "file" }, jsprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "javascript", scheme: "untitled" }, jsprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "typescript", scheme: "file" }, tsprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "typescript", scheme: "untitled" }, tsprovider, ...triggerCharacters));
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            try {
                const { offsetID } = getReqText(document, position);
                const sortResults = await syncer.get(offsetID);
                const items = ll == null ? [] : (Array.isArray(ll) ? ll : ll.items);
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
