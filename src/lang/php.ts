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

    public datamask(s: string, trivialLiterals: Set<string>): string {
        return s;
    }
}
