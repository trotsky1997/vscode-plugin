import { ID_REGEX, LangUtil } from "./langUtil";

export class CppLangUtil extends LangUtil {

    public genericTypeRegex = /^([a-zA-Z0-9_$]+|<|>|,|\[\])$/;

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

    public hasSpaceBetween(tokens: string[], nextI: number): boolean {
        const left = nextI === 0 ? "" : tokens[nextI - 1];
        const right = tokens[nextI];
        if (left === "" || right === "") { return false; }
        if (left === "::" || right === "::") { return false; }
        if (left === "." || right === ".") { return false; }
        if (left === "<ENTER>" || right === "<ENTER>") { return false; }
        if (left === "(" || right === ")") { return false; }
        if (left === "[" || right === "]") { return false; }
        if (left === "for" || left === "while" || left === "if") { return true; }
        if (right === "[") { return false; }
        if (left.match(ID_REGEX) && right === "(") { return false; }
        if (right === ";") { return false; }
        if (left === "++" || right === "++") { return false; }
        if (left === "--" || right === "--") { return false; }
        if (left === ">" && (right === "*" || right === "&")) {
            return true;
        }
        if (left !== "<str>" && right !== "<str>" && !left.match(ID_REGEX) && !right.match(ID_REGEX)) {
            return false;
        }
        if (right === "<" || right === ">") {
            return !this.isGenericTypeBracket(tokens, nextI);
        }
        if (left === "<" || left === ">") {
            return !this.isGenericTypeBracket(tokens, nextI - 1);
        }
        return true;
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
}
