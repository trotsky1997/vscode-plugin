import { ID_REGEX, LangUtil } from "./langUtil";

const keywords = new Set<string>();
["break", "default", "func", "interface", "select", "case", "defer", "go", "map", "struct", "chan", "else", "goto", "package", "switch",
    "const", "fallthrough", "if", "range", "type", "continue", "for", "import", "return", "var"].map(keywords.add.bind(keywords));

export class GoLangUtil extends LangUtil {
    constructor() {
        super(false);
        this.binops.push(":=");
        this.initSpacingOptions();
        this.tags2str["<bool>"] = "true";
        this.tags2str["<null>"] = "nil";
        this.addSpacingOption("import", "(", true);
        this.addSpacingOption("func", "(", true);
        this.addSpacingOption(")", LangUtil.SpacingKeyID, true);
        this.addSpacingOption(LangUtil.SpacingKeyID, "[", (tokens, nextI) => {
            // type ByAge []Person
            // a[i]
            while (nextI < tokens.length && (tokens[nextI] === "[" || tokens[nextI] === "]")) {
                nextI++;
            }
            return nextI < tokens.length && tokens[nextI - 1] === "]" && tokens[nextI].match(ID_REGEX) != null;
        });
        this.addSpacingOption("]", LangUtil.SpacingKeyID, false);
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

    public getKeywords(): Set<string> {
        return keywords;
    }
}
