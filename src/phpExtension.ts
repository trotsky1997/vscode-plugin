import * as path from "path";
import * as vscode from "vscode";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetry, showInformationMessage, SortResult, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";

export async function activatePhp(context: vscode.ExtensionContext) {
    const msphpId = "vscode.php-language-features";
    const msphp = vscode.extensions.getExtension(msphpId);
    const intelephenseId = "bmewburn.vscode-intelephense-client";
    const intelephense = vscode.extensions.getExtension(intelephenseId);
    const syncer = new Syncer<SortResult>();

    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;
        if (msphp) {
            log(`AiX: ${msphpId} detected`);
            const distjsPath = path.join(msphp.extensionPath, "dist", "phpMain.js");
            await JSHooker("/**AiXHooked-1**/", distjsPath, msphp, "php.reload.msphp", "php.fail.msphp", (distjs) => {
                const handleResultCode = (r: string) => `const aix = require(\"vscode\").extensions.getExtension("${myID}");const api = aix && aix.exports;if(api && api.aixhook){${r}=await api.aixhook(\"php\",${r},$1,$2,$3,$4,\"basic\");}`;
                const newProvideCompletionItems = `async provideCompletionItems($1,$2,$3,$4){let rr=await this.provideCompletionItems2($1,$2,$3,$4);${handleResultCode("rr")};return rr;}`;
                distjs = distjs.replace(/provideCompletionItems\((\w+),(\w+),(\w+),(\w+)\){/, `${newProvideCompletionItems}provideCompletionItems2($1,$2,$3,$4){`);
                return distjs;
            });
        }
        if (intelephense) {
            log(`AiX: ${intelephenseId} detected`);
            const distjsPath = path.join(intelephense.extensionPath, "lib", "extension.js");
            await JSHooker("/**AiXHooked-3**/", distjsPath, intelephense, "php.reload.intelephense", "php.fail.intelephense", (distjs) => {
                const handleResultCode = (r: string) => `const aix = require(\"vscode\").extensions.getExtension("${myID}");const api = aix && aix.exports;if(api && api.aixhook){${r}=await api.aixhook(\"php\",${r},$1,$2,$3,$4,\"intelephense\");}`;
                distjs = distjs.replace(/provideCompletionItems:\((\w+),(\w+),(\w+),(\w+)\)=>(.+?),resolveCompletionItem:/, `provideCompletionItems:async($1,$2,$3,$4)=>{console.log("intelephense called");let rr=$5;${handleResultCode("rr")};return rr;},resolveCompletionItem:`);
                return distjs;
            });
        } else {
            showInformationMessage("intelephense.install", "action.install").then((selection) => {
                if (selection === localize("action.install")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(intelephenseId));
                }
            });
        }
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            log("=====================");
            try {
                const ext = "php(Php)";
                const { longResults, sortResults, offsetID, fetchTime } = await fetchResults(document, position, ext, "php", STAR_DISPLAY.RIGHT);

                if (msphp || intelephense) {
                    syncer.put(offsetID, sortResults);
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("php"), document);
                    longResults.push(...sortLabels);
                }
                sendPredictTelemetry(fetchTime, longResults);
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
    const triggerCharacters = [".", "=", "$", ">"];
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "php", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "php", scheme: "untitled" }, provider, ...triggerCharacters));
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext, ext: string): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            if (ext === "basic" && !vscode.workspace.getConfiguration("php").get("suggest.basic", true)) {
                return ll;
            }
            try {
                const { offsetID } = getReqText(document, position);
                const sortResults = await syncer.get(offsetID);
                const items = Array.isArray(ll) ? ll : ll.items;

                mergeSortResult(items, sortResults, document, STAR_DISPLAY.RIGHT);
                return new vscode.CompletionList(items, true);
            } catch (e) {
                log(e);
            }
        },
    };
}
