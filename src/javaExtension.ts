import * as path from "path";
import * as vscode from "vscode";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetryLong, sendPredictTelemetryShort, showInformationMessageOnce, SortResultEx, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export async function activateJava(context: vscode.ExtensionContext) {
    const redhatjavaExtension = vscode.extensions.getExtension("redhat.java");
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    let activated = false;
    const syncer = new Syncer<SortResultEx>();
    let hooked = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;
        if (redhatjavaExtension) {
            log("AiX: redhat.java detected");

            const distjsPath = path.join(redhatjavaExtension.extensionPath, "dist", "extension.js");
            hooked = await JSHooker("/**AiXHooked-0**/", distjsPath, redhatjavaExtension, "java.reload", "java.fail", (distjs) => {
                const middleware = `middleware:{
                    provideCompletionItem:async(_a1,_a2,_a3,_a4,_a5)=>{
                        let rr=_a5(_a1,_a2,_a3,_a4);
                        const aix = require("vscode").extensions.getExtension("${myID}");
                        const api = aix && aix.exports;
                        if(api && api.aixhook){
                            rr = await api.aixhook("java",rr,_a1,_a2,_a3,_a4);
                        }
                        return rr;
                    }
                }`;
                distjs = distjs.replace(",outputChannelName:E", ",outputChannelName:E," + middleware);
                return distjs;
            });

            if (msintellicode) {
                const intellicodeDistjsPath = path.join(msintellicode.extensionPath, "dist", "intellicode.js");
                hooked = await JSHooker("/**AiXHooked-1**/", intellicodeDistjsPath, msintellicode, "java.reload", "java.fail", (distjs) => {
                    const s = SafeStringUtil.indexOf(distjs, "i.languages.registerCompletionItemProvider");
                    const s1 = SafeStringUtil.indexOf(distjs, "provideCompletionItems:", s);
                    const e = SafeStringUtil.indexOf(distjs, ",resolveCompletionItem:", s1);
                    let body = SafeStringUtil.substring(distjs, s1, e);
                    body = body.replace(/provideCompletionItems:\s*\((.+?),\s*(.+?),\s*(.+?),\s*(.+?)\)\s*=>(.+)/, `provideCompletionItems:($1,$2,$3,$4)=>{let rr=$5;
                        const aix = require("vscode").extensions.getExtension("${myID}");
                        const api = aix && aix.exports;
                        if(api && api.aixhook){
                            rr = api.aixhook("java",rr,$1,$2,$3,$4);
                        }
                        return rr;}`);
                    return SafeStringUtil.substring(distjs, 0, s1) + body + SafeStringUtil.substring(distjs, e);
                }) && hooked;
            }

            if (redhatjavaExtension && !redhatjavaExtension.isActive) {
                try {
                    await redhatjavaExtension.activate();
                } catch (error) {
                    log("AiX: redhat.java activate failed reason:");
                    log(error);
                    vscode.window.showErrorMessage(localize("redhatjavaExtension.activate.fail") + error);
                }
            }
            log("AiX: com.aixcoder.jdtls.extension.enable command success");
        } else {
            showInformationMessageOnce("redhatjavaExtension.install", "action.install").then((selection) => {
                if (selection === localize("action.install")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/redhat.java"));
                }
            });
        }
    }
    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            // log("=====================");
            const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.java") as string;
            try {
                const { longResults, sortResults, offsetID, fetchTime, current } = await fetchResults(document, position, ext, "java", syncer, STAR_DISPLAY.LEFT);
                if (redhatjavaExtension && redhatjavaExtension.isActive && hooked) {
                    syncer.put(offsetID, { ...sortResults, ext, fetchTime, current });
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("java"), document, ext, current);
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
    const triggerCharacters = ["="];
    if (!msintellicode) {
        triggerCharacters.push(".");
    }
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "java", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "java", scheme: "untitled" }, provider, ...triggerCharacters));
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completioContext: vscode.CompletionContext): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            try {
                // return ll;
                const { offsetID } = getReqText(document, position, "java");
                const items = Array.isArray(ll) ? ll : ll.items;
                if (items.length > 0) {
                    items[0].preselect = false;
                }

                const sortResults = await syncer.get(offsetID, items.length === 0);
                if (sortResults == null) { return ll; }
                const { ext, fetchTime } = sortResults;
                mergeSortResult(items, sortResults, document, "java", ext, STAR_DISPLAY.LEFT);
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
