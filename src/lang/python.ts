import { ID_REGEX, LangUtil } from "./langUtil";

const keywords = new Set<string>();
["False", "None", "True", "and", "as", "assert", "break", "class", "continue", "def", "del", "elif", "else",
    "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or",
    "pass", "raise", "return", "try", "while", "with", "yield", "async", "await"].map(keywords.add.bind(keywords));

export class PythonLangUtil extends LangUtil {
    constructor() {
        super();
        this.tags2str["<bool>"] = "True";
        this.tags2str["<null>"] = "None";
        this.addSpacingOption(LangUtil.SpacingKeyALL, ":", (tokens, nextI) => {
            return tokens[nextI - 1] !== "<str>";
        });
        this.addSpacingOption("<str>", "<str>", true);
        this.addSpacingOption(")", ":", false);
        this.addSpacingOption(")", "as", true);
        this.addSpacingOptionAround("=", LangUtil.SpacingKeyALL, (tokens, nextI) => {
            const lpar = tokens.indexOf("(");
            return lpar <= 0 || lpar > nextI || tokens[lpar - 1].match(ID_REGEX) == null;
        });
        this.hasSpaceBetweenMap.delete(":");
        this.addSpacingOption(":", LangUtil.SpacingKeyALL, true);
        this.hasSpaceBetweenMap.get(LangUtil.SpacingKeyALL).delete(":");
        this.addSpacingOption(LangUtil.SpacingKeyALL, ":", (tokens, nextI) => {
            const lpar = tokens.indexOf("[");
            if (lpar < 0) { return false; }
            const rpar = tokens.indexOf("]", lpar);
            return rpar > nextI;
        });
    }

    public getKeywords(): Set<string> {
        return keywords;
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        let stringBuilder = "";
        let emptyLine = true;
        let lastLineEnd = 0;
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            if (c === "\n") {
                stringBuilder += c;
                emptyLine = true;
                lastLineEnd = stringBuilder.length;
            } else if (c === "\"" || c === "'" || c === "`") {
                stringBuilder += c;
                let pythonDoc: boolean;
                ({ i, stringBuilder, pythonDoc } = this.skipString(s, trivialLiterals, stringBuilder, i, c));
                if (emptyLine && pythonDoc) {
                    stringBuilder = stringBuilder.substr(0, stringBuilder.length - 2);
                }
                emptyLine = false;
            } else if (s.startsWith("#", i)) {
                // line comment
                i = this.skipAfter(s, i + 2, "\n") - 1;
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
        if (this.betweenPair(text, "\"", "\"") || this.betweenPair(text, "'", "'") ||
            this.betweenPair(text, "\"\"\"", "\"\"\"") || this.betweenPair(text, "'''", "'''")) {
            return false;
        }
        // in comment
        const lineStart = text.lastIndexOf("\n") + 1;
        if (text.indexOf("#", lineStart) >= 0) {
            return false;
        }
        return true;
    }

    protected skipString(s: string, trivialLiterals: Set<string>, stringBuilder: string, i: number, char: string) {
        const c = s.charAt(i);
        const pythonDoc = c === s.charAt(i + 1) && c === s.charAt(i + 2);
        if (pythonDoc) {
            i += 2;
        }
        i++;
        const strStart = i;
        for (; i < s.length; i++) {
            if (pythonDoc) {
                if (s.startsWith(c + c + c, i)) {
                    break;
                }
            } else {
                if (s.charAt(i) === char) {
                    break;
                }
                if (s.charAt(i) === "\\") {
                    i++;
                }
            }
        }
        const strContent = s.substring(strStart, i);
        if (trivialLiterals.has(strContent)) {
            stringBuilder += strContent;
        }
        stringBuilder += char;
        if (pythonDoc) {
            i += 2;
        }
        return { i, stringBuilder, pythonDoc };
    }
}
