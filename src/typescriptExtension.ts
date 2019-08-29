import * as path from "path";
import * as vscode from "vscode";
import { fetchResults, fetchResults2, formatSortData, getReqText, JSHooker, mergeSortResult, myID, sendPredictTelemetryLong, sendPredictTelemetryShort, SortResultEx, STAR_DISPLAY } from "./extension";
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

    const jsprovider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.javascript") as string;
                const { offsetID, sortResults, fetchTime, longResults } = await fetchResults(document, position, ext, "js", syncer, STAR_DISPLAY.LEFT);
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
            await _activate();
            log("=====================");
            try {
                const ext = vscode.workspace.getConfiguration().get("aiXcoder.model.typescript") as string;
                const { offsetID, sortResults, fetchTime, longResults } = await fetchResults(document, position, ext, "ts", syncer, STAR_DISPLAY.LEFT);
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

    const vueprovider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            try {
                let ext = vscode.workspace.getConfiguration().get("aiXcoder.model.javascript") as string;
                const startTime = Date.now();
                const { text: t, remainingText, offsetID } = getReqText(document, position);
                let text: string;
                const lastScriptTag = Math.max(t.lastIndexOf("<script "), t.lastIndexOf("<script>"));
                if (lastScriptTag < 0) {
                    text = "";
                } else {
                    if (t.startsWith("<script lang=\"ts\"", lastScriptTag) || t.startsWith("<script lang='ts'", lastScriptTag) || t.startsWith("<script lang=\"typescript\"", lastScriptTag) || t.startsWith("<script lang='typescript'", lastScriptTag)) {
                        ext = vscode.workspace.getConfiguration().get("aiXcoder.model.typescript") as string;
                    }
                    const lastScriptTagEnd = t.indexOf(">", lastScriptTag) + 1;
                    text = lastScriptTagEnd === 0 ? "" : t.substring(lastScriptTagEnd);
                }
                if (text.length === 0) {
                    if (msts && hooked) {
                        syncer.put(offsetID, null);
                    }
                    return [];
                }
                log(text);
                const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, "ts", document, STAR_DISPLAY.LEFT);
                log("< fetch took " + (Date.now() - startTime) + "ms");
                if (msts && hooked) {
                    syncer.put(offsetID, { ...sortResults, ext, fetchTime });
                } else {
                    const sortLabels = formatSortData(sortResults, getInstance("ts"), document, ext);
                    longResults.push(...sortLabels);
                }
                if (!token.isCancellationRequested) {
                    sendPredictTelemetryLong(ext, fetchTime, longResults);
                }
                log("provideCompletionItems vue of " + ext + " ends " + longResults.length);
                return new vscode.CompletionList(longResults, true);
            } catch (e) {
                log(e);
            }
        },
        resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
            return null;
        },
    };
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "vue", scheme: "file" }, vueprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "vue", scheme: "untitled" }, vueprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "html", scheme: "file" }, vueprovider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "html", scheme: "untitled" }, vueprovider, ...triggerCharacters));

    function reactproviderMaker(ext: string, lang: string) {
        return {
            async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
                await _activate();
                try {
                    const startTime = Date.now();
                    const { text: t, remainingText, offsetID } = getReqText(document, position);
                    let text = t;
                    if (t.match(/<\s*([a-zA-Z_$][a-zA-Z_$0-9]*)[^>]*>(.(?!\1))*?$/s)) {
                        // inside react tag. Using regex to match react tags is faulty.
                        text = "";
                    }
                    if (text.length === 0) {
                        if (msts && hooked) {
                            syncer.put(offsetID, null);
                        }
                        return [];
                    }
                    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, lang, document, STAR_DISPLAY.LEFT);
                    log("< fetch took " + (Date.now() - startTime) + "ms");
                    if (msts && hooked) {
                        syncer.put(offsetID, { ...sortResults, ext, fetchTime });
                    } else {
                        const sortLabels = formatSortData(sortResults, getInstance(lang), document, ext);
                        longResults.push(...sortLabels);
                    }
                    if (!token.isCancellationRequested) {
                        sendPredictTelemetryLong(ext, fetchTime, longResults);
                    }
                    log("provideCompletionItems vue of " + ext + " ends " + longResults.length);
                    return new vscode.CompletionList(longResults, true);
                } catch (e) {
                    log(e);
                }
            },
            resolveCompletionItem(): vscode.ProviderResult<vscode.CompletionItem> {
                return null;
            },
        };
    }

    const reactJsProvider = reactproviderMaker(vscode.workspace.getConfiguration().get("aiXcoder.model.javascript") as string, "js");
    const reactTsProvider = reactproviderMaker(vscode.workspace.getConfiguration().get("aiXcoder.model.typescript") as string, "ts");
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "javascriptreact", scheme: "file" }, reactJsProvider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "javascriptreact", scheme: "untitled" }, reactJsProvider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "typescriptreact", scheme: "file" }, reactTsProvider, ...triggerCharacters));
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider({ language: "typescriptreact", scheme: "untitled" }, reactTsProvider, ...triggerCharacters));

    return {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            try {
                // return ll;
                const { offsetID } = getReqText(document, position);
                const sortResults = await syncer.get(offsetID);
                // console.log(`syncer.get ${offsetID} ${sortResults}`);
                if (sortResults == null) { return ll; }
                const items = ll == null ? [] : (Array.isArray(ll) ? ll : ll.items);
                const { ext, fetchTime } = sortResults;

                mergeSortResult(items, sortResults, document, ext.indexOf("Typescript") >= 0 ? "ts" : "js", ext, STAR_DISPLAY.LEFT);
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
