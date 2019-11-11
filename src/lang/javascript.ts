import { ID_REGEX, LangUtil } from "./langUtil";

const keywords = new Set<string>();
["for", "in", "while", "do", "break", "return", "continue", "switch", "case", "default", "if", "else",
    "throw", "try", "catch", "finally", "new", "delete", "typeof", "instanceof", "void", "yield", "this", "of",
    "var", "let", "with", "function", "abstract", "boolean", "byte", "char", "class", "const", "debugger",
    "double", "enum", "export", "extends", "final", "float", "goto", "implements", "import", "int", "interface",
    "long", "native", "package", "private", "protected", "public", "short", "static", "super", "synchronized",
    "throws", "transient", "volatile", "true", "false", "null", "NaN", "Infinity", "undefined"].map(keywords.add.bind(keywords));

export class JavaScriptLangUtil extends LangUtil {
    constructor() {
        super();
        this.hasSpaceBetweenMap.delete(":");
        this.addSpacingOption(":", LangUtil.SpacingKeyALL, true);
        this.hasSpaceBetweenMap.get(LangUtil.SpacingKeyALL).delete(":");
        this.addSpacingOption(LangUtil.SpacingKeyALL, ":", false);
        this.addSpacingOption("...", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "=>", true);
        this.addSpacingOption("export", "=", true);
        this.addSpacingOption("const", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption("let", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption("var", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption("...", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption("import", LangUtil.SpacingKeyALL, true);
    }

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

    public shouldPredict(text: string) {
        // in string
        text = this.datamask(text, new Set());
        if (this.betweenPair(text, "\"", "\"") || this.betweenPair(text, "'", "'") || this.betweenPair(text, "`", "`")) {
            return false;
        }
        // in comment
        if (this.betweenPair(text, "/*", "*/")) {
            return false;
        }
        const lineStart = text.lastIndexOf("\n") + 1;
        if (text.indexOf("//", lineStart) >= 0) {
            return false;
        }
        return true;
    }
}
