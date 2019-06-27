import * as path from "path";
import * as vscode from "vscode";
import { fetchResults2, formatSortData, getReqText, JSHooker, sendPredictTelemetry, showInformationMessage, SingleWordCompletion, SortResult, STAR_DISPLAY } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";
import { SafeStringUtil } from "./utils/SafeStringUtil";

export async function activateCPP(context: vscode.ExtensionContext) {
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    const mscpp = vscode.extensions.getExtension("ms-vscode.cpptools");
    const activated = false;
    const sortResultAwaiters = {};
    let clients: any;
    if (mscpp) {
        const distjsPath = path.join(mscpp.extensionPath, "dist", "main.js");
        await JSHooker("/**AiXHooked**/", distjsPath, mscpp, "cpp.reload", "cpp.fail", (distjs) => {
            const cpptoolsSignature = "t.CppTools=class{";
            const cpptoolsStart = SafeStringUtil.indexOf(distjs, cpptoolsSignature) + cpptoolsSignature.length;
            const languageServerUglyEnd = SafeStringUtil.indexOf(distjs, ".getClients()", cpptoolsStart);
            let languageServerUglyStart = languageServerUglyEnd;
            while (languageServerUglyStart > cpptoolsStart) {
                languageServerUglyStart--;
                if (!distjs[languageServerUglyStart].match(/[a-zA-Z]/)) {
                    languageServerUglyStart++;
                    break;
                }
            }
            const languageServerUgly = SafeStringUtil.substring(distjs, languageServerUglyStart, languageServerUglyEnd);
            distjs = SafeStringUtil.substring(distjs, 0, cpptoolsStart) + `getClients(){return ${languageServerUgly}.getClients()}` + SafeStringUtil.substring(distjs, cpptoolsStart);
            return distjs;
        });

        if (mscpp) {
            if (!mscpp.isActive) {
                await mscpp.activate();
            }
            clients = mscpp.exports.getApi().getClients();
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

    function getHookedProvideCompletionItems(oldProvideCompletionItems) {
        return async (document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext, provideCompletionItems) => {
            const resultP = oldProvideCompletionItems(document, position, token, completionContext, provideCompletionItems);
            if (resultP) {
                const offsetID = getReqText(document, position).text;
                const l: vscode.CompletionList = await resultP;
                let sortResults;
                if (sortResultAwaiters[offsetID] == null) {
                    sortResults = await new Promise((resolve, reject) => {
                        const canceller = setTimeout(() => {
                            reject("time out");
                            delete sortResultAwaiters[offsetID];
                        }, 5000);
                        sortResultAwaiters[offsetID] = (_) => {
                            clearTimeout(canceller);
                            resolve(_);
                        };
                    });
                } else {
                    sortResults = await sortResultAwaiters[offsetID];
                }
                delete sortResultAwaiters[offsetID];
                const telemetryCommand: vscode.Command = {
                    title: "AiXTelemetry",
                    command: "aiXcoder.insert",
                    arguments: ["use", "secondary", getInstance("cpp"), document],
                };
                for (let i = 0; i < sortResults.list.length; i++) {
                    const single: SingleWordCompletion = sortResults.list[i];
                    let found = false;
                    for (const systemCompletion of l.items) {
                        if (systemCompletion.sortText == null) {
                            systemCompletion.sortText = systemCompletion.filterText;
                        }
                        if (systemCompletion.insertText === single.word) {
                            // systemCompletion.label = "⭐" + systemCompletion.label;
                            systemCompletion.label = systemCompletion.label + "⭐";
                            systemCompletion.sortText = "0." + i;
                            systemCompletion.command = { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) };
                            found = true;
                        }
                    }
                    if (!found && single.options && single.options.forced) {
                        l.items.push({
                            label: single.word + "⭐",
                            insertText: single.word,
                            sortText: "0." + i,
                            command: { ...telemetryCommand, arguments: telemetryCommand.arguments.concat([single]) },
                            kind: vscode.CompletionItemKind.Variable,
                        });
                    }
                }
                return l;
            }
            return null;
        };
    }

    const provider = {
        async provideCompletionItems(document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completionContext: vscode.CompletionContext): Promise<vscode.CompletionItem[] | vscode.CompletionList> {
            await _activate();
            const ext = "cpp(Cpp)";
            // log("=====================");
            try {
                const { text, remainingText } = getReqText(document, position);
                const offsetID = text;
                let r = null;
                if (mscpp) {
                    const resolver: (_: SortResult) => void = await new Promise((res, rej) => {
                        if (sortResultAwaiters[offsetID] == null) {
                            const p = new Promise((resolve, reject) => {
                                const canceller = setTimeout(() => {
                                    log("master timeout, reject");
                                    reject("time out");
                                    delete sortResultAwaiters[offsetID];
                                }, 5000);
                                res((_) => {
                                    clearTimeout(canceller);
                                    resolve(_);
                                });
                            });
                            sortResultAwaiters[offsetID] = p;
                        } else {
                            res(sortResultAwaiters[offsetID]);
                        }
                    });
                    const client = clients.ActiveClient.languageClient;
                    const oldProvideCompletionItems = client.clientOptions.middleware.provideCompletionItem;
                    if (!oldProvideCompletionItems.aixhooked) {
                        log("Hooking C++ extension...");
                        client.clientOptions.middleware.provideCompletionItem = getHookedProvideCompletionItems(oldProvideCompletionItems);
                        client.clientOptions.middleware.provideCompletionItem.aixhooked = true;
                        delete sortResultAwaiters[offsetID]; // it won't work first time
                        log("C++ extension Hooked");
                    }
                    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, "cpp", document, STAR_DISPLAY.NONE);
                    if (typeof resolver === "function") {
                        resolver(sortResults);
                    }
                    sendPredictTelemetry(fetchTime, longResults);
                    r = longResults;
                } else {
                    const { longResults, sortResults, fetchTime } = await fetchResults2(text, remainingText, document.fileName, ext, "cpp", document, STAR_DISPLAY.LEFT);
                    const sortLabels = formatSortData(sortResults, getInstance("cpp"), document);
                    longResults.push(...sortLabels);
                    sendPredictTelemetry(fetchTime, longResults);
                    r = longResults;
                }
                log("provideCompletionItems ends");
                return r;
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
}
