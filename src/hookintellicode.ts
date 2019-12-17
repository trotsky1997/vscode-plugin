import * as path from "path";
import * as vscode from "vscode";
import { JSHooker, myID } from "./extension";
import { SafeStringUtil } from "./utils/SafeStringUtil";

const languageId2Model = {
    python: { language: "python" },
    java: { language: "java" },
    c: { language: "cpp" },
    cpp: { language: "cpp" },
    php: { language: "php" },
    javascript: { language: "typescript" },
    vue: { language: "typescript" },
    typescript: { language: "typescript" },
    html: { language: "typescript" },
    javascriptreact: { language: "typescript" },
    typescriptreact: { language: "typescript" },
    go: { language: "golang" },
};

export async function hookIntellicode(context: vscode.ExtensionContext, aixHooks: {
    [lang: string]: void | {
        aixHook: (ll: vscode.CompletionList | vscode.CompletionItem[], ...args: any) => Promise<vscode.CompletionList | vscode.CompletionItem[]>,
    },
}) {
    let hooked = false;
    const msintellicode = vscode.extensions.getExtension("visualstudioexptteam.vscodeintellicode");
    if (msintellicode) {
        const intellicodeDistjsPath = path.join(msintellicode.extensionPath, "dist", "intellicode.js");
        hooked = await JSHooker("/**AiXHooked-online-2**/", intellicodeDistjsPath, msintellicode, "java.reload", "java.fail", (distjs) => {
            const s = SafeStringUtil.indexOf(distjs, "i.languages.registerCompletionItemProvider");
            const s1 = SafeStringUtil.indexOf(distjs, "provideCompletionItems:", s);
            const e = SafeStringUtil.indexOf(distjs, ",resolveCompletionItem:", s1);
            let body = SafeStringUtil.substring(distjs, s1, e);
            body = body.replace(/provideCompletionItems:\s*\((.+?),\s*(.+?),\s*(.+?),\s*(.+?)\)\s*=>(.+)/, `provideCompletionItems:($1,$2,$3,$4)=>{let rr=$5;
                        const aix = require("vscode").extensions.getExtension("${myID}");
                        const api = aix && aix.exports;
                        if(api && api.aixhook){
                            rr = api.aixhook("intellicode",rr,$1,$2,$3,$4);
                        }
                        return rr;}`);
            return SafeStringUtil.substring(distjs, 0, s1) + body + SafeStringUtil.substring(distjs, e);
        }) && hooked;
    }
    aixHooks.intellicode = {
        async aixHook(ll: vscode.CompletionList | vscode.CompletionItem[], document: vscode.TextDocument, position: vscode.Position, token: vscode.CancellationToken, completioContext: vscode.CompletionContext): Promise<vscode.CompletionList | vscode.CompletionItem[]> {
            if (languageId2Model.hasOwnProperty(document.languageId)) {
                const realLang: string = languageId2Model[document.languageId].language;
                const hook = aixHooks[realLang];
                if (hook) {
                    return hook.aixHook(ll, document, position, token, completioContext);
                }
            }
            return ll;
        },
    };
}
