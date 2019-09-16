import { ID_REGEX, LangUtil } from "./langUtil";

const keywords = new Set<string>();
["for", "in", "while", "do", "break", "return", "continue", "switch", "case", "default", "if", "else",
    "throw", "try", "catch", "finally", "new", "delete", "typeof", "instanceof", "void", "yield", "this", "of",
    "var", "let", "with", "function", "abstract", "boolean", "byte", "char", "class", "const", "debugger",
    "double", "enum", "export", "extends", "final", "float", "goto", "implements", "import", "int", "interface",
    "long", "native", "package", "private", "protected", "public", "short", "static", "super", "synchronized",
    "throws", "transient", "volatile", "true", "false", "null", "NaN", "Infinity", "undefined"].map(keywords.add.bind(keywords));
export class JavaScriptLangUtil extends LangUtil {
    public getKeywords(): Set<string> {
        return keywords;
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        let stringBuilder = "";
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            stringBuilder += (c);
            if (c === '"' || c === "'" || c === "`") {
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
}
