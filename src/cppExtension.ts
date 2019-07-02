import * as path from "path";
import * as vscode from "vscode";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetry, showInformationMessage, SortResult, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export async function activateCPP(context: vscode.ExtensionContext) {
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    const mscpp = vscode.extensions.getExtension("ms-vscode.cpptools");
    const activated = false;
    const syncer = new Syncer<SortResult>();
    if (mscpp) {
        const distjsPath = path.join(mscpp.extensionPath, "dist", "main.js");
        await JSHooker("/**AiXHooked-1**/", distjsPath, mscpp, "cpp.reload", "cpp.fail", (distjs) => {
            const handleResultCode = (r: string) => `const api = require(\"vscode\").extensions.getExtension("${myID}").exports;if(api && api.aixhook){${r}=await api.aixhook(\"cpp\",${r},$1,$2,$3,$4);}`;
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
            showInformationMessage("mscpptoolsExtension.install", "action.install").then((selection) => {
                if (selection === localize("action.install")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-vscode.cpptools"));
                }
            });
        }
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.cpp") as string;
            // log("=====================");
            try {
                const { longResults, sortResults, offsetID, fetchTime } = await fetchResults(document, position, ext, "python", STAR_DISPLAY.LEFT);
                if (mscpp) {
                    syncer.put(offsetID, sortResults);
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("cpp"), document);
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
    const triggerCharacters = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k", "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v", "w", "x", "y", "z", "="];
    if (!msintellicode) {
        triggerCharacters.push(".");
    }
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "c", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "c", scheme: "untitled" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "cpp", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "cpp", scheme: "untitled" }, provider, ...triggerCharacters));
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
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
