import * as path from "path";
import * as vscode from "vscode";
import { TelemetryType } from "./API";
import { fetchResults, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetryLong, sendPredictTelemetryShort, showInformationMessageOnce, SortResultEx, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { Syncer } from "./Syncer";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export async function activateGo(context: vscode.ExtensionContext) {
    const msgo = vscode.extensions.getExtension("ms-vscode.go");
    const activated = false;
    const syncer = new Syncer<SortResultEx>();
    let hooked = false;
    if (msgo) {
        const distjsPath = path.join(msgo.extensionPath, "out", "src", "goLanguageServer.js");
        hooked = await JSHooker("/**AiXHooked-2**/", distjsPath, msgo, "go.reload", "go.fail", (distjs) => {
            const pciStart = SafeStringUtil.indexOf(distjs, "middleware: {");
            const A = distjs.substring(0, pciStart + "middleware: {".length);
            const B = distjs.substring(pciStart + "middleware: {".length);
            const handleResultCode = `provideCompletionItem: async (document, position, context, token, next) => {
                let r = next(document, position, context, token);
                const aix = require("vscode").extensions.getExtension("${myID}");
                const api = aix && aix.exports;
                if (api && api.aixhook) {
                    r = api.aixhook("go",r,document,position,context,token);
                }
                return r;
            },`;
            return A + handleResultCode + B;
        });

        const distjsPath2 = path.join(msgo.extensionPath, "out", "src", "goSuggest.js");
        const hooked2 = await JSHooker("/**AiXHooked-1**/", distjsPath2, msgo, "go.reload", "go.fail", (distjs) => {
            const pciStart = SafeStringUtil.indexOf(distjs, "provideCompletionItems(");
            const retStart = SafeStringUtil.indexOf(distjs, "});", pciStart);
            const A = SafeStringUtil.substring(distjs, 0, retStart);
            const B = SafeStringUtil.substring(distjs, retStart);
            const handleResultCode = `}).then(r => {
                const aix = require(\"vscode\").extensions.getExtension("${myID}");
                const api = aix && aix.exports;
                if (api && api.aixhook) {
                    r = api.aixhook(\"go\",r,document,position,context,token);
                }
                return r;
            `;
            return A + handleResultCode + B;
        });

        hooked = hooked && hooked2;

        if (msgo) {
            if (!msgo.isActive) {
                await msgo.activate();
            }
        }
    }
    async function _activate() {
        if (activated) {
            return;
        }
        if (!msgo) {
            showInformationMessageOnce("msgoExtension.install", "action.install").then((selection) => {
                if (selection === "action.install") {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("vscode:extension/ms-vscode.go"));
                }
            });
        }
    }
    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completioContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            const ext = "go(Go)";
            // log("=====================");
            try {
                const { longResults, sortResults, offsetID, fetchTime, current } = await fetchResults(document, position, ext, "go", syncer, STAR_DISPLAY.LEFT);
                if (msgo && msgo.isActive && hooked) {
                    syncer.put(offsetID, { ...sortResults, ext, fetchTime, current });
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("go"), document, ext, current);
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
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "go", scheme: "file" }, provider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "go", scheme: "untitled" }, provider, ...triggerCharacters));
    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completioContext: vscode.CompletionContext): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            try {
                // return ll;
                const { offsetID } = getReqText(document, position, "go");
                const items = Array.isArray(ll) ? ll : ll.items;
                if (items.length > 0) {
                    items[0].preselect = false;
                }

                const sortResults = await syncer.get(offsetID, items.length === 0);
                if (sortResults == null) { return ll; }
                const { ext, fetchTime } = sortResults;
                mergeSortResult(items, sortResults, document, "go", ext, STAR_DISPLAY.LEFT);
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
