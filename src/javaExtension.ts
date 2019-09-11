import * as vscode from "vscode";
import { TelemetryType } from "./API";
import { fetchResults, formatSortData, mergeSortResult, onDeactivateHandlers, sendPredictTelemetryLong, sendPredictTelemetryShort, showInformationMessage } from "./extension";
import { localize } from "./i18n";
import { getInstance } from "./lang/commons";
import log from "./logger";

export function activateJava(context: vscode.ExtensionContext) {
    const redhatjavaExtension = vscode.extensions.getExtension("redhat.java");
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    let activated = false;
    async function _activate() {
        if (activated) {
            return;
        }
        activated = true;
        if (redhatjavaExtension) {
            log("AiX: redhat.java detected");
            if (!msintellicode) {
                if (!redhatjavaExtension.isActive) {
                    try {
                        await redhatjavaExtension.activate();
                    } catch (error) {
                        log("AiX: redhat.java activate failed reason:");
                        log(error);
                        vscode.window.showErrorMessage(localize("redhatjavaExtension.activate.fail") + error);
                    }
                }
                onDeactivateHandlers.push(() => {
                    vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.enable", true);
                });
                try {
                    await vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.enable", false);
                } catch (reason) {
                    log("AiX: com.aixcoder.jdtls.extension.enable command  failed reason:");
                    log(reason);
                }
                log("AiX: com.aixcoder.jdtls.extension.enable command success");
            } else {
                log("AiX: visualstudioexptteam.vscodeintellicode detected");
            }
        } else {
            showInformationMessage("redhatjavaExtension.install", "action.install").then((selection) => {
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
            try {
                const ext = "java(Java)";
                if (redhatjavaExtension) {
                    const fetchPromise = fetchResults(document, position, ext, "java");
                    const redhatPromise = vscode.commands.executeCommand("java.execute.workspaceCommand", "com.aixcoder.jdtls.extension.completion", {
                        textDocument: {
                            uri: document.uri.toString(),
                        },
                        position,
                        completionContext,
                    });
                    const { longResults, sortResults, fetchTime, current } = await fetchPromise;
                    const l = await redhatPromise as vscode.CompletionItem[];
                    mergeSortResult(l, {...sortResults, ext, fetchTime, current}, document, "java", ext);
                    longResults.push(...l);
                    if (!token.isCancellationRequested) {
                        sendPredictTelemetryLong(ext, fetchTime, longResults);
                    }
                    return new vscode.CompletionList(longResults, true);
                } else {
                    const { longResults, sortResults, fetchTime, current } = await fetchResults(document, position, ext, "java");
                    const sortLabels = formatSortData(sortResults, getInstance("java"), document, ext, current);
                    longResults.push(...sortLabels);
                    if (!token.isCancellationRequested) {
                        sendPredictTelemetryLong(ext, fetchTime, longResults);
                    }
                    return new vscode.CompletionList(longResults, true);
                }
                // log("provideCompletionItems ends");
            } catch (e) {
                if (e.message.includes("command 'java.execute.workspaceCommand' not found")) {
                    log(localize("java.redhat.loading"));
                } else {
                    log(e);
                }
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
}
