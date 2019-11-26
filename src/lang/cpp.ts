import { AiXCompletionItem } from "../extension";
import { ID_REGEX, LangUtil } from "./langUtil";

const keywords = new Set<string>();
["abstract", "continue", "for", "new", "switch", "assert", "default", "goto", "package", "synchronized",
    "boolean", "do", "if", "private", "this", "break", "double", "implements", "protected", "throw", "byte",
    "else", "import", "public", "throws", "case", "enum", "instanceof", "return", "transient", "catch",
    "extends", "int", "short", "try", "char", "final", "interface", "static", "void", "class", "finally",
    "long", "strictfp", "volatile", "const", "float", "native", "super", "while", "using", "sizeof"].map(keywords.add.bind(keywords));

export class CppLangUtil extends LangUtil {

    public genericTypeRegex = /^([a-zA-Z0-9_$]+|<|>|,|\[\])$/;

    public constructor() {
        super();
        this.addSpacingOption("*", ")", false);
        this.addSpacingOption("*", LangUtil.SpacingKeyID, false);
        this.addSpacingOption("*", "*", false);
        this.addSpacingOptionAround("::", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("->", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(LangUtil.SpacingKeyALL, ">", (tokens, nextI) => {
            return !this.isGenericTypeBracket(tokens, nextI);
        });
        this.addSpacingOption(LangUtil.SpacingKeyALL, "<", (tokens, nextI) => {
            return !this.isGenericTypeBracket(tokens, nextI);
        });
        this.addSpacingOption("<", LangUtil.SpacingKeyALL, (tokens, nextI) => {
            return !this.isGenericTypeBracket(tokens, nextI - 1);
        });
        this.addSpacingOption(">", LangUtil.SpacingKeyALL, true);
    }
    public getKeywords(): Set<string> {
        return keywords;
    }

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

    public retrigger(completionItem: AiXCompletionItem) {
        if (completionItem.label.endsWith("->") || completionItem.label.endsWith("::")) {
            return true;
        }
        return super.retrigger(completionItem);
    }
}
