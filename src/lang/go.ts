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
