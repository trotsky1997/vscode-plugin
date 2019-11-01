import * as path from "path";
import * as vscode from "vscode";
import { TelemetryType } from "./API";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetryLong, sendPredictTelemetryShort, showInformationMessageOnce, SortResultEx, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export async function activateCPP(context: vscode.ExtensionContext) {
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    const mscpp = vscode.extensions.getExtension("ms-vscode.cpptools");
    const activated = false;
    const syncer = new Syncer<SortResultEx>();
    let hooked = false;
    if (mscpp) {
        const distjsPath = path.join(mscpp.extensionPath, "dist", "main.js");
        hooked = await JSHooker("/**AiXHooked-2**/", distjsPath, mscpp, "cpp.reload", "cpp.fail", (distjs) => {
            const handleResultCode = (r: string) => `const aix = require(\"vscode\").extensions.getExtension("${myID}");const api = aix && aix.exports;if(api && api.aixhook){${r}=await api.aixhook(\"cpp\",${r},$1,$2,$3,$4);}`;
            const targetCode = `provideCompletionItems: async \($1, $2, $3, $4\) => { let rr=($5);${handleResultCode("rr")};return rr;}`;
            const sig = /provideCompletionItems:\s*\((\w+),\s*(\w+),\s*(\w+),\s*(\w+)\)\s*=>\s*{\s*return\s+((?:.|\s)+?);\s*}/;
            if (distjs.search(sig) >= 0) {
                // insider
                return distjs.replace(sig, targetCode);
            }
            const releaseSig = /provideCompletionItems:\((\w+),(\w+),(\w+),(\w+)\)=>((?:.|\s)+?)(?=,resolveCompletionItem:)/;
            if (distjs.search(releaseSig) >= 0) {
                // release
                return distjs.replace(releaseSig, targetCode);
            }
            throw new SafeStringUtil.NotFoundError("");
        });

        if (mscpp) {
            if (!mscpp.isActive) {
                await mscpp.activate();
            }
        }
    }
    async function _activate() {
        if (activated) {
            return;
        }
        if (!mscpp) {
            showInformationMessageOnce("mscpptoolsExtension.install", "action.install").then((selection) => {
                if (selection === "action.install") {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-vscode.cpptools"));
                }
            });
        }
    }
    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completioContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.cpp") as string;
            // log("=====================");
            try {
                const { longResults, sortResults, offsetID, fetchTime, current } = await fetchResults(document, position, ext, "cpp", syncer, STAR_DISPLAY.LEFT);
                if (!document.isUntitled && mscpp && hooked) {
                    syncer.put(offsetID, { ...sortResults, ext, fetchTime, current });
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("cpp"), document, ext, current);
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
    const triggerCharacters = ["=", "."];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "c", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "c", scheme: "untitled" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "cpp", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "cpp", scheme: "untitled" }, provider, ...triggerCharacters));
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completioContext: vscode.CompletionContext): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            try {
                // return ll;
                const { offsetID } = getReqText(document, position, "cpp");
                const items = Array.isArray(ll) ? ll : ll.items;
                const sortResults = await syncer.get(offsetID, items.length === 0);
                if (sortResults == null) { return ll; }
                const { ext, fetchTime } = sortResults;
                mergeSortResult(items, sortResults, document, "cpp", ext, STAR_DISPLAY.LEFT);
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
