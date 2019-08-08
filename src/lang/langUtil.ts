import * as vscode from "vscode";

import { Rescue } from "../extension";

export const ID_REGEX = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

export class LangUtil {
    protected tags2str = {
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

    public renderToken(token: string): string {
        if (this.tags2str.hasOwnProperty(token)) {
            token = this.tags2str[token];
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

    public hasSpaceBetween(tokens: string[], nextI: number): boolean {
        const left = nextI === 0 ? "" : tokens[nextI - 1];
        const right = tokens[nextI];
        if (left === "" || right === "") { return false; }
        if (right === ",") { return false; }
        if (left === "." || right === ".") { return false; }
        if (left === "<ENTER>" || right === "<ENTER>") { return false; }
        if (left === "(" || right === ")") { return false; }
        if (left === "[" || right === "]") { return false; }
        if (left === ",") { return true; }
        if (left === "for" || left === "while") { return true; }
        if (right === "(" || right === "[") {
            return left.match(ID_REGEX) == null;
        }
        if (left === ")" && right === "{") { return true; }
        if (right === ";") { return false; }
        if (right === "{") { return true; }
        if (!left.match(ID_REGEX) && !right.match(ID_REGEX)) { return false; }
        return true;
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        return s;
    }

    /**
     * apply rescues
     */
    public rescue(document: vscode.TextDocument, rescues: Rescue[]) {
    }
}
