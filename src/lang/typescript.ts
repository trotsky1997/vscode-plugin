import { JavaScriptLangUtil } from "./javascript";
import { ID_REGEX, LangUtil } from "./langUtil";

const keywords = new Set<string>();
["for", "in", "while", "do", "break", "return", "continue", "switch", "case", "default", "if", "else",
    "throw", "try", "catch", "finally", "new", "delete", "typeof", "instanceof", "void", "this", "var", "let",
    "with", "function", "abstract", "boolean", "byte", "char", "class", "const", "debugger", "double", "enum",
    "export", "extends", "final", "float", "goto", "implements", "import", "int", "interface", "long", "native",
    "package", "private", "protected", "public", "short", "static", "super", "synchronized", "throws",
    "transient", "volatile", "true", "false", "null", "NaN", "Infinity", "undefined", "module", "string",
    "bool", "number", "constructor", "declare", "interface", "as", "AS", "super"].map(keywords.add.bind(keywords));

export class TypeScriptLangUtil extends JavaScriptLangUtil {

    public genericTypeRegex = /^([a-zA-Z0-9_$]+|<|>|,|\[\])$/;

    public constructor() {
        super();
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
        this.addSpacingOption(":", LangUtil.SpacingKeyALL, true);
        this.hasSpaceBetweenMap.get(LangUtil.SpacingKeyALL).delete(":");
        this.addSpacingOption(LangUtil.SpacingKeyALL, ":", false);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "=>", true);
        this.addSpacingOption(">", "(", false);
        this.addSpacingOption("constructor", "=", true);
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

    public shouldPredict(text: string) {
        // in string
        try {
            this.datamask(text, new Set());
        } catch (error) {
            return false;
        }
        return true;
    }
}
