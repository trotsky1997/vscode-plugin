import { LangUtil } from "./langUtil";
const keywords = new Set<string>();
["and", "E_PARSE", "old_function", "E_ERROR", "or", "as", "E_WARNING", "parent", "eval", "PHP_OS", "break",
    "exit", "case", "extends", "PHP_VERSION", "cfunction", "FALSE", "print", "for", "require", "continue",
    "foreach", "require_once", "declare", "return", "default", "static", "do", "switch", "die", "stdClass",
    "echo", "else", "TRUE", "elseif", "var", "empty", "if", "xor", "enddeclare", "include", "virtual", "endfor",
    "include_once", "while", "endforeach", "global", "endif", "list", "endswitch", "new", "endwhile", "not",
    "array", "E_ALL", "NULL", "final", "php_user_filter", "interface", "implements", "public", "private",
    "protected", "abstract", "clone", "try", "catch", "throw", "this", "use", "namespace", "trait", "yield",
    "finall", "function", "class"].map(keywords.add.bind(keywords));

export class PhpLangUtil extends LangUtil {

    public constructor() {
        super();
        this.constants.push("<mstr>");
        this.addSpacingOption(LangUtil.SpacingKeyALL, ":", false);
        this.addSpacingOption("$", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption("@", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption("!", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(")", "or", true);
        this.addSpacingOption(")", "and", true);
        this.addSpacingOptionAround("or", LangUtil.SpacingKeyALL, true);
        this.addSpacingOptionAround("and", LangUtil.SpacingKeyALL, true);
    }

    public getKeywords(): Set<string> {
        return keywords;
    }

    public shouldPredict(text: string) {
        // in string
        text = this.datamask(text, new Set());
        if (this.betweenPair(text, "\"", "\"") || this.betweenPair(text, "'", "'")) {
            return false;
        }
        // in comment
        if (this.betweenPair(text, "/*", "*/")) {
            return false;
        }
        const lineStart = text.lastIndexOf("\n") + 1;
        if (text.indexOf("//", lineStart) >= 0 || text.indexOf("#", lineStart) >= 0) {
            return false;
        }
        return true;
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
            } else if (s.startsWith("<<<", i)) {
                let j = i + 3;
                while (j < s.length && s[j].match(/^[a-zA-Z0-9_$]$/)) {
                    j++;
                }
                let lineEnd = j;
                while (lineEnd < s.length && s[lineEnd] !== "\n") {
                    lineEnd++;
                }
                const heredocTag = s.substring(i + 3, j);
                stringBuilder += "\"";
                // tslint:disable-next-line: variable-name
                ({ i, stringBuilder } = this.skipString2(s, trivialLiterals, stringBuilder, lineEnd + 1, (_s, _i) => {
                    if (_s.substring(_i).match(new RegExp(`^\n${heredocTag.replace("$", "\\$")}( |\\t)*(?=;|\\n)`))) {
                        return heredocTag.length + 2;
                    }
                    return -1;
                }));
                i -= 1;
                stringBuilder += "\"";
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
}
