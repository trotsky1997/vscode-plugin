import * as vscode from "vscode";

import { AiXCompletionItem, CompletionOptions, Rescue } from "../extension";
import { MatchFailedError } from "./MatchFailedError";

export const ID_REGEX = /^[a-zA-Z$_][a-zA-Z_$0-9]*$/;

type SpaceSupplier = (tokens: string[], nextI: number) => boolean;
export abstract class LangUtil {
    protected static readonly SpacingKeyALL = "#All#";
    protected static readonly SpacingKeyID = "#ID#";
    protected static readonly SpacingKeyNoID = "#NoID#";
    protected static readonly SpacingKeyConstants = "#Constant#";
    protected static readonly SpacingKeyTags = "#Tag#";
    protected static readonly SpacingKeyBinOp = "#BinOp#";
    protected tags = [
        "<ENTER>",
        "<IND>",
        "<UNIND>",
        "<BREAK>",
        "<UNK>",
    ];

    protected constants = [
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
        this.addSpacingOptionAround("\n", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround(LangUtil.SpacingKeyTags, LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("\t", LangUtil.SpacingKeyALL, false);
        if (initSpacingOptions) {
            this.initSpacingOptions();
        }
    }

    public retrigger(completionItem: AiXCompletionItem) {
        if (completionItem.label.endsWith(";") || completionItem.label.endsWith("{") || completionItem.label.endsWith("}")) {
            return false;
        }
        if (completionItem.label.endsWith(".")) {
            return true;
        }
        return vscode.workspace.getConfiguration().get("aiXcoder.retrigger");
    }

    public initSpacingOptions() {
        this.addSpacingOptionAround("", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround(".", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(",", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, ",", false);
        this.addSpacingOptionAround("=", LangUtil.SpacingKeyALL, true);
        this.addSpacingOptionAround("(", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround(LangUtil.SpacingKeyID, ")", false);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("[", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(";", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, LangUtil.SpacingKeyConstants, true);
        this.addSpacingOption("while", "(", true);
        this.addSpacingOption("for", "(", true);
        this.addSpacingOption("if", "(", true);
        this.addSpacingOption("switch", "(", true);
        this.addSpacingOption("catch", "(", true);
        this.addSpacingOptionRightKeywords("{", true);
        this.addSpacingOptionRightKeywords(LangUtil.SpacingKeyID, true);
        this.addSpacingOptionRightKeywords(LangUtil.SpacingKeyConstants, true);
        this.addSpacingOptionRightKeywords(LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(LangUtil.SpacingKeyID, "(", false);
        this.addSpacingOption(LangUtil.SpacingKeyALL, ";", false);
        this.addSpacingOption(LangUtil.SpacingKeyNoID, "{", true);
        this.addSpacingOption(LangUtil.SpacingKeyNoID, LangUtil.SpacingKeyNoID, false);
        this.addSpacingOptionAround("++", LangUtil.SpacingKeyALL, false);
        this.addSpacingOptionAround("--", LangUtil.SpacingKeyALL, false);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "}", true);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, "}", true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "]", false);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, "]", false);
        this.addSpacingOption("{", LangUtil.SpacingKeyConstants, true);
        this.addSpacingOption(LangUtil.SpacingKeyALL, "{", true);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, ":", false);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, ":", false);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, ";", false);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, ".", false);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, ")", false);
        this.addSpacingOption(":", LangUtil.SpacingKeyConstants, true);
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
        this.addSpacingOption(LangUtil.SpacingKeyConstants, ",", false);
        this.addSpacingOption(LangUtil.SpacingKeyID, LangUtil.SpacingKeyConstants, true);
        this.addSpacingOption(LangUtil.SpacingKeyConstants, LangUtil.SpacingKeyNoID, true);
        this.addSpacingOption("return", LangUtil.SpacingKeyALL, true);
        this.addSpacingOption("return", ";", false);
        this.addSpacingOption("@", LangUtil.SpacingKeyALL, false);
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
        for (const tag of this.constants) {
            if (token.startsWith(tag)) {
                return tag;
            }
        }
        return token;
    }

    public renderToken(token: string, options?: CompletionOptions): string {
        for (const constant of this.constants) {
            if (token.startsWith(constant)) {
                if (options) {
                    options.forced = true;
                }
                return this.constants2str(constant, token.substring(constant.length));
            }
        }
        if (this.tags.indexOf(token) >= 0) {
            return this.tags2str(token);
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
        let emptyLine = true;
        let lastLineEnd = 0;
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            if (c === "\n") {
                stringBuilder += c;
                emptyLine = true;
                lastLineEnd = stringBuilder.length;
            } else if (c === "\"" || c === "'") {
                stringBuilder += c;
                emptyLine = false;
                ({ i, stringBuilder } = this.skipString(s, trivialLiterals, stringBuilder, i, c));
            } else if (s.startsWith("//", i)) {
                // line comment
                i = this.skipAfter(s, i + 2, "\n") - 1;
                if (emptyLine) {
                    stringBuilder = stringBuilder.substring(0, lastLineEnd);
                } else {
                    i--;
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

    public shouldPredict(text: string) {
        // in string
        try {
            this.datamask(text, new Set());
        } catch (error) {
            return false;
        }
        return true;
    }

    protected occurrences(s: string, subString: string, allowOverlapping = false) {
        s += "";
        subString += "";
        if (subString.length <= 0) { return (s.length + 1); }

        let n = 0;
        let pos = 0;
        const step = allowOverlapping ? 1 : subString.length;

        while (true) {
            pos = s.indexOf(subString, pos);
            if (pos >= 0) {
                ++n;
                pos += step;
            } else { break; }
        }
        return n;
    }

    protected betweenPair(text: string, start: string, end: string) {
        if (start === end) {
            return this.occurrences(text, start) % 2 === 1;
        }
        const s = text.lastIndexOf(start);
        const e = text.lastIndexOf(end);
        if (s < 0 || e > s) {
            return false;
        }
        return true;
    }

    protected constants2str(token: string, value?: string): string {
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

    protected tags2str(token: string): string {
        switch (token) {
            case "<ENTER>":
                return "\n";
            case "<IND>":
                return "";
            case "<UNIND>":
                return "";
            case "<BREAK>":
                return "";
            case "<UNK>":
                return "";
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
        return t === LangUtil.SpacingKeyConstants || t === LangUtil.SpacingKeyBinOp || t === LangUtil.SpacingKeyTags;
    }

    protected *iterateGenericToken(t: string) {
        if (t === LangUtil.SpacingKeyConstants) {
            for (const constant of this.constants) {
                yield constant;
            }
        } else if (t === LangUtil.SpacingKeyBinOp) {
            for (const binOp of this.binops) {
                yield binOp;
            }
        } else if (t === LangUtil.SpacingKeyTags) {
            for (const tag of this.tags) {
                yield tag;
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

    protected skipAfter(s: string, i: number, target: string) {
        let matchFailed = true;
        for (; i < s.length; i++) {
            if (s.startsWith(target, i)) {
                i += target.length;
                matchFailed = false;
                break;
            }
        }
        if (matchFailed) {
            throw new MatchFailedError();
        }
        return i;
    }

    protected skipString(s: string, trivialLiterals: Set<string>, stringBuilder: string, i: number, c: string) {
        i++;
        const strStart = i;
        let matchFailed = true;
        for (; i < s.length; i++) {
            if (s[i] === c) {
                matchFailed = false;
                break;
            }
            if (s[i] === "\\") {
                i++;
            }
        }
        if (matchFailed) {
            throw new MatchFailedError();
        }
        const strContent = s.substring(strStart, i);
        if (trivialLiterals.has(strContent)) {
            stringBuilder += strContent;
        }
        stringBuilder += c;
        return { i, stringBuilder };
    }

    protected skipString2(s: string, trivialLiterals: Set<string>, stringBuilder: string, i: number, pred: ((s: string, i: number) => number)) {
        const strStart = i;
        let skipLen = -1;
        let matchFailed = true;
        for (; i < s.length; i++) {
            skipLen = pred(s, i);
            if (skipLen >= 0) {
                matchFailed = false;
                break;
            }
        }
        if (matchFailed) {
            throw new MatchFailedError();
        }
        const strContent = s.substring(strStart, i);
        if (trivialLiterals.has(strContent)) {
            stringBuilder += strContent;
        }
        if (skipLen >= 0) {
            i += skipLen;
        }
        return { i, stringBuilder };
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
