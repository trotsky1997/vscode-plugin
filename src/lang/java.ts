import * as vscode from "vscode";
import { Rescue } from "../extension";
import logger from "../logger";
import { ID_REGEX, LangUtil } from "./langUtil";

export class JavaLangUtil extends LangUtil {

    public genericTypeRegex = /^([a-zA-Z0-9_$]+|<|>|,|\[\])$/;

    public isGenericTypeBracket(tokens: string[], i: number): boolean {
        if (tokens[i] === "<") {
            let level = 1;
            for (; level > 0 && i < tokens.length; i++) {
                if (tokens[i].length === 0) {
                    continue;
                }
                if (tokens[i] === ">") {
                    level--;
                } else if (!tokens[i].match(this.genericTypeRegex)) {
                    break;
                }
            }
            return level === 0;
        } else if (tokens[i] === ">") {
            let level = 1;
            for (; level > 0 && i >= 0; i--) {
                if (tokens[i].length === 0) {
                    continue;
                }
                if (tokens[i] === "<") {
                    level--;
                } else if (!tokens[i].match(this.genericTypeRegex)) {
                    break;
                }
            }
            return level === 0;
        } else {
            return false;
        }
    }

    public hasSpaceBetween(tokens: string[], nextI: number): boolean {
        const left = nextI === 0 ? "" : tokens[nextI - 1];
        const right = tokens[nextI];
        if (left === "" || right === "") { return false; }
        if (left === "." || right === ".") { return false; }
        if (right === ",") { return false; }
        if (left === "<ENTER>" || right === "<ENTER>") { return false; }
        if (left === "=" || right === "(") { return true; }
        if (left === ";" || right === "}") { return true; }
        if (left === "(" || right === ")") { return false; }
        if (left === "[" || right === "]") { return false; }
        if (right === "<str>" || right === "<int>") { return true; }
        if (right === "[") { return false; }
        if (left === "for" || left === "while" || left === "if") { return true; }
        if (!left.match(ID_REGEX) && right === "{") { return true; }
        if (left.match(ID_REGEX) && right === "(") { return false; }
        if (right === ";") { return false; }
        if (!left.match(ID_REGEX) && !right.match(ID_REGEX)) { return false; }
        if (left === "++" || right === "++") { return false; }
        if (left === "--" || right === "--") { return false; }

        if (right === "<" || right === ">") {
            return !this.isGenericTypeBracket(tokens, nextI);
        }
        if (left === "<" || left === ">") {
            return !this.isGenericTypeBracket(tokens, nextI - 1);
        }
        return true;
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        let stringBuilder = "";
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            stringBuilder += (c);
            if (c === '"' || c === "'") {
                i++;
                const strStart = i;
                for (; i < s.length; i++) {
                    if (s.charAt(i) === c) {
                        break;
                    }
                    if (s.charAt(i) === "\\") {
                        i++;
                    }
                }
                const strContent = s.substring(strStart, i);
                if (trivialLiterals.has(strContent)) {
                    stringBuilder += strContent;
                }
                stringBuilder += c;
            }
        }
        return stringBuilder;
    }

    public rescue(document: vscode.TextDocument, rescues: Rescue[]) {
        const editor = vscode.window.activeTextEditor;
        let imports: Array<[string, number]> | null = null;
        let importStart = -1;
        function prepareImports() {
            imports = [];
            for (let i = 0; i < document.lineCount; i++) {
                const line = document.lineAt(i);
                if (importStart === -1 && line.text.match(/^\s*package\s.*$/)) {
                    importStart = i;
                    continue;
                }
                const m = line.text.match(/^\s*import\s+(.*);$/);
                if (m) {
                    imports.push([m[1], i]);
                }
            }
        }
        if (editor) {
            editor.edit((editBuilder) => {
                function rescueImport(rescue: Rescue) {
                    if (imports === null) {
                        prepareImports();
                    }
                    let prevImport: [string, number] = ["", importStart];
                    for (const importContent of imports) {
                        const compareResult = importContent[0].localeCompare(rescue.value);
                        if (compareResult === 0) {
                            return;
                        }
                    }
                    for (let i = 0; i < imports.length; i++) {
                        const importContent = imports[i];
                        const compareResult = importContent[0].localeCompare(rescue.value);
                        if (compareResult === 0) {
                            return;
                        }
                        if (compareResult > 0) {
                            // stop here
                            imports.splice(i, 0, [rescue.value, prevImport[1] + 1]);
                            editBuilder.insert(new vscode.Position(prevImport[1] + 1, 0), `import ${rescue.value};\n`);
                            for (i += 1; i < imports.length; i++) {
                                imports[i][1]++;
                            }
                            return;
                        }
                        prevImport = importContent;
                    }
                    imports.push([rescue.value, prevImport[1] + 1]);
                    editBuilder.insert(new vscode.Position(prevImport[1] + 1, 0), `import ${rescue.value};\n`);
                }

                for (const rescue of rescues) {
                    switch (rescue.type) {
                        case "import":
                            if (vscode.workspace.getConfiguration().get("aiXcoder.autoImport")) {
                                rescueImport(rescue);
                            }
                            break;
                        default:
                            logger.warn(`Unknown rescue type ${rescue.type} with value=${rescue.value}`);
                            break;
                    }
                }
            });
        }
    }
}
