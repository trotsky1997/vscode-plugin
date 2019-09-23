import * as vscode from "vscode";

import { CompletionOptions, Rescue } from "../extension";

export const ID_REGEX = /^[a-zA-Z$_][a-zA-Z_$0-9]*$/;

type SpaceSupplier = (tokens: string[], nextI: number) => boolean;
export abstract class LangUtil {
    protected static readonly SpacingKeyALL = "#All#";
    protected static readonly SpacingKeyID = "#ID#";
    protected static readonly SpacingKeyNoID = "#NoID#";
    protected static readonly SpacingKeyTag = "#Tag#";
    protected static readonly SpacingKeyBinOp = "#BinOp#";
    protected tags = [
        "<str>",
        "<char>",
        "<float>",
        "<int>",
        "<double>",
        "<long>",
        "<bool>",
        "<null>",
    ];

    protected binops = [
        "+",
        "-",
        "*",
        "/",
        "**",
        "&",
        "|",
        "^",
        "&&",
        "||",
        "==",
        "===",
        "!=",
        "!==",
        ">",
        ">=",
        "<",
        "<=",
        "<>",
    ];

    protected myTags2str = {
        "<ENTER>": "\n",
        "<IND>": "",
        "<UNIND>": "",
        "<BREAK>": "",
        "<str>": "\"\"",
        "<char>": "''",
        "<float>": "0.0",
        "<int>": "0",
        "<double>": "0.0",
        "<long>": "0",
        "<bool>": "true",
        "<null>": "null",
    };
    protected defaultSupplier = new Map<boolean, SpaceSupplier>();
    protected hasSpaceBetweenMap = new Map<string, Map<string, SpaceSupplier>>();
    public constructor(initSpacingOptions = true) {
        this.defaultSupplier.set(true, () => true);
        this.defaultSupplier.set(false, () => false);
        this.addSpacingOptionAround(LangUtil.SpacingKeyALL, LangUtil.SpacingKeyALL, true);
        this.addSpacingOptionAround(LangUtil.SpacingKeyID, LangUtil.SpacingKeyID, true);
        this.addSpacingOptionAround("<ENTER>", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("\n", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("<IND>", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("<UNIND>", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("\t", LangUtil.SpacingKeyALL, false);
        if (initSpacingOptions) {
            this.initSpacingOptions();
        }
    }

    public initSpacingOptions() {
        this.addSpacingOptionAround("", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround(".", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(",", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, ",", false);
        this.addSpacingOptionAround("<ENTER>", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("=", LangUtil.SpacingKeyALL, true);
        this.addSpacingOptionAround("(", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround(LangUtil.SpacingKeyID, ")", false);
        this.addSpacingOption(LangUtil.SpacingKeyTag, LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("[", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(";", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, LangUtil.SpacingKeyTag, true);
        this.addSpacingOption("while", "(", true);
        this.addSpacingOption("for", "(", true);
        this.addSpacingOption("if", "(", true);
        this.addSpacingOptionRightKeywords("{", true);
        this.addSpacingOptionRightKeywords(LangUtil.SpacingKeyID, true);
        this.addSpacingOptionRightKeywords(LangUtil.SpacingKeyTag, true);
        this.addSpacingOptionRightKeywords(LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(LangUtil.SpacingKeyID, "(", false);
        this.addSpacingOption(LangUtil.SpacingKeyALL, ";", false);
        this.addSpacingOption(LangUtil.SpacingKeyNoID, "{", true);
        this.addSpacingOption(LangUtil.SpacingKeyNoID, LangUtil.SpacingKeyNoID, false);
        this.addSpacingOptionAround("++", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("--", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "}", true);
        this.addSpacingOption(LangUtil.SpacingKeyTag, "}", true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "]", false);
        this.addSpacingOption(LangUtil.SpacingKeyTag, "]", false);
        this.addSpacingOption("{", LangUtil.SpacingKeyTag, true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "{", true);
        this.addSpacingOption(LangUtil.SpacingKeyTag, ":", false);
        this.addSpacingOption(LangUtil.SpacingKeyTag, ":", false);
        this.addSpacingOption(LangUtil.SpacingKeyTag, ";", false);
        this.addSpacingOption(LangUtil.SpacingKeyTag, ".", false);
        this.addSpacingOption(LangUtil.SpacingKeyTag, ")", false);
        this.addSpacingOption(":", LangUtil.SpacingKeyTag, true);
        this.addSpacingOption(LangUtil.SpacingKeyBinOp, "-", true);
        this.addSpacingOption(LangUtil.SpacingKeyBinOp, "+", true);
        this.addSpacingOptionAround(LangUtil.SpacingKeyBinOp, LangUtil.SpacingKeyALL, true);
        const posNeg: SpaceSupplier = (tokens, nextI) => {
            return tokens.length > nextI - 2 && (tokens[nextI - 2].match(ID_REGEX) != null || tokens[nextI - 2].match(/^<.+>/) != null);
        };
        this.addSpacingOption("!", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption("-", "+", posNeg);
        this.addSpacingOption("-", "<int>", posNeg);
        this.addSpacingOption("+", "<int>", posNeg);
        this.addSpacingOption("-", "<float>", posNeg);
        this.addSpacingOption("+", "<float>", posNeg);
        this.addSpacingOption("-", "<double>", posNeg);
        this.addSpacingOption("+", "<double>", posNeg);
        this.addSpacingOption("-", LangUtil.SpacingKeyID, posNeg);
        this.addSpacingOption("+", LangUtil.SpacingKeyID, posNeg);
        this.addSpacingOption(LangUtil.SpacingKeyTag, ",", false);
        this.addSpacingOption(LangUtil.SpacingKeyID, LangUtil.SpacingKeyTag, true);
        this.addSpacingOption(LangUtil.SpacingKeyTag, LangUtil.SpacingKeyNoID, true);
    }

    /**
     * getTemplateForTag
     */
    // tslint:disable: no-invalid-template-strings
    public getTemplateForTag(tag: string, order = 0) {
        switch (tag) {
            case "<str>":
                return "\"${0}\"";
            case "<char>":
                return "'${0}'";
            case "<float>":
                return "${0:0.0}";
            case "<int>":
                return "${0:0}";
            case "<double>":
                return "${0:0.0}";
            case "<long>":
                return "${0:0}";
            case "<bool>":
                return "${0:true}";
            case "<null>":
                return "null${0}";
            default:
                break;
        }
        return "${0}" + tag;
    }

    public abstract getKeywords(): Set<string>;

    public getBaseTag(token: string) {
        for (const tag of this.tags) {
            if (token.startsWith(tag)) {
                return tag;
            }
        }
        return token;
    }

    public renderToken(token: string, options?: CompletionOptions): string {
        for (const tag of this.tags) {
            if (token.startsWith(tag)) {
                if (options) {
                    options.forced = true;
                }
                return this.tags2str(tag, token.substring(tag.length));
            }
        }
        return token;
    }

    public render(tokens: string[], start: number): string {
        let r = "";
        for (let i = start; i < tokens.length; i++) {
            let token = tokens[i];
            token = this.renderToken(token);
            if (token !== "" && i > 0 && this.hasSpaceBetween(tokens, i)) {
                r += " ";
            }
            r += token;
        }
        return r;
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        let stringBuilder = "";
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            stringBuilder += (c);
            if (c === '"' || c === "'") {
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

    /**
     * apply rescues
     */
    public rescue(document: vscode.TextDocument, rescues: Rescue[]) {
    }

    public hasSpaceBetween(tokens: string[], nextI: number): boolean {
        const previousToken = nextI >= 1 ? tokens[nextI - 1] : null;
        const nextToken = nextI > 0 && nextI < tokens.length ? tokens[nextI] : null;
        if (previousToken == null || nextToken == null) {
            return false;
        }
        const getter = this.getHasSpaceBetweenGetter(previousToken, nextToken);
        return getter(tokens, nextI);
    }

    protected tags2str(token: string, value?: string): string {
        switch (token) {
            case "<str>":
                if (value[0] === "\"" && value[value.length - 1] === "\"") {
                    value = value.substring(1, value.length - 1);
                }
                return "\"" + value.replace("<str_space>", " ") + "\"";
            case "<char>":
                if (value[0] === "'" && value[value.length - 1] === "'") {
                    value = value.substring(1, value.length - 1);
                }
                return "'" + value.replace("<str_space>", " ") + "'";
            case "<float>":
                return value || "0.0";
            case "<int>":
                return value || "0";
            case "<double>":
                return value || "0.0";
            case "<long>":
                return value || "0";
            case "<bool>":
                return value || "true";
            case "<null>":
                return value || "null";
            default:
                break;
        }
        return token;
    }

    protected addSpacingOptionAround(token: string, otherToken: string, hasSpace: boolean | SpaceSupplier) {
        if (typeof (hasSpace) === "boolean") {
            this.addSpacingOption(token, otherToken, this.defaultSupplier.get(hasSpace));
            this.addSpacingOption(otherToken, token, this.defaultSupplier.get(hasSpace));
            return;
        }
        this.addSpacingOption(token, otherToken, hasSpace);
        this.addSpacingOption(otherToken, token, hasSpace);
    }

    protected isGenericToken(t: string) {
        return t === LangUtil.SpacingKeyTag || t === LangUtil.SpacingKeyBinOp;
    }

    protected *iterateGenericToken(t: string) {
        if (t === LangUtil.SpacingKeyTag) {
            for (const tag of this.tags) {
                yield tag;
            }
        } else if (t === LangUtil.SpacingKeyBinOp) {
            for (const binOp of this.binops) {
                yield binOp;
            }
        }
    }

    protected addSpacingOption(previousToken: string, nextToken: string, hasSpace: boolean | SpaceSupplier) {
        if (typeof (hasSpace) === "boolean") {
            this.addSpacingOption(previousToken, nextToken, this.defaultSupplier.get(hasSpace));
            return;
        }
        if (this.isGenericToken(previousToken)) {
            for (const tag of this.iterateGenericToken(previousToken)) {
                this.addSpacingOption(tag, nextToken, hasSpace);
            }
            return;
        }
        if (this.isGenericToken(nextToken)) {
            for (const tag of this.iterateGenericToken(nextToken)) {
                this.addSpacingOption(previousToken, tag, hasSpace);
            }
            return;
        }
        if (!this.hasSpaceBetweenMap.has(previousToken)) {
            this.hasSpaceBetweenMap.set(previousToken, new Map<string, SpaceSupplier>());
        }
        const map = this.hasSpaceBetweenMap.get(previousToken);
        map.set(nextToken, hasSpace);
    }

    protected addSpacingOptionLeftKeywords(previousToken: string, hasSpace: boolean | SpaceSupplier) {
        if (typeof (hasSpace) === "boolean") {
            this.addSpacingOptionLeftKeywords(previousToken, this.defaultSupplier.get(hasSpace));
            return;
        }
        for (const keyword of this.getKeywords()) {
            this.addSpacingOption(previousToken, keyword, hasSpace);
        }
    }

    protected addSpacingOptionRightKeywords(nextToken: string, hasSpace: boolean | SpaceSupplier) {
        if (typeof (hasSpace) === "boolean") {
            this.addSpacingOptionRightKeywords(nextToken, this.defaultSupplier.get(hasSpace));
            return;
        }
        for (const keyword of this.getKeywords()) {
            this.addSpacingOption(keyword, nextToken, hasSpace);
        }
    }

    private getHasSpaceBetweenGetterStrict(previousToken: string, nextToken: string): SpaceSupplier | null {
        if (this.hasSpaceBetweenMap.has(previousToken)) {
            const map = this.hasSpaceBetweenMap.get(previousToken);
            if (map.has(nextToken)) {
                return map.get(nextToken);
            }
            return null;
        }
        return null;
    }

    private getHasSpaceBetweenGetter(previousToken: string, nextToken: string): SpaceSupplier {
        previousToken = this.getBaseTag(previousToken);
        nextToken = this.getBaseTag(nextToken);
        const prevID = previousToken.match(ID_REGEX) ? LangUtil.SpacingKeyID : LangUtil.SpacingKeyNoID;
        const nextID = nextToken.match(ID_REGEX) ? LangUtil.SpacingKeyID : LangUtil.SpacingKeyNoID;
        // Checking order:
        const orders = [[previousToken, nextToken],         // 1. A->B
        [previousToken, nextID],                            // 2. A->ID/NoID
        [previousToken, LangUtil.SpacingKeyALL],            // 3. A->All
        [prevID, nextToken],                                // 4. ID/NoID->B
        [LangUtil.SpacingKeyALL, nextToken],                // 5. All->B
        [prevID, nextID],                                   // 6. ID/NoID->ID/NoID
        [prevID, LangUtil.SpacingKeyALL],                   // 7. ID/NoID->ALL
        [LangUtil.SpacingKeyALL, nextID],                   // 8. ALL->ID/NoID
        [LangUtil.SpacingKeyALL, LangUtil.SpacingKeyALL],   // 9. ALL->ALL
        ];
        for (const [p, n] of orders) {
            const t = this.getHasSpaceBetweenGetterStrict(p, n);
            if (t) {
                return t;
            }
        }
        return this.defaultSupplier.get(true);
    }
}
