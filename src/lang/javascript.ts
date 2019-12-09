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
        let emptyLine = true;
        let lastLineEnd = -1;
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            if (c === "\n") {
                stringBuilder += c;
                emptyLine = true;
                lastLineEnd = stringBuilder.length;
            } else if (c === "\"" || c === "'" || c === "`") {
                stringBuilder += c;
                emptyLine = false;
                ({ i, stringBuilder } = this.skipString(s, trivialLiterals, stringBuilder, i, c));
            } else if (s.startsWith("//", i)) {
                // line comment
                i = this.skipAfter(s, i + 2, "\n") - 1;
                if (emptyLine) {
                    stringBuilder = stringBuilder.substring(0, lastLineEnd);
                }
            } else if (s.startsWith("/*", i)) {
                /* block comment */
                i = this.skipAfter(s, i + 2, "*/") - 1;
                if (emptyLine) {
                    stringBuilder = stringBuilder.substring(0, lastLineEnd);
                }
            } else {
                stringBuilder += c;
                if (c !== "\t" && c !== " ") {
                    emptyLine = false;
                }
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
