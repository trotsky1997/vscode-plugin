import { ID_REGEX, LangUtil } from "./langUtil";

export class JavaLangUtil extends LangUtil {

    public hasSpaceBetween(tokens: string[], nextI: number): boolean {
        let left = nextI === 0 ? "" : tokens[nextI - 1];
        const right = tokens[nextI];
        if (left === "" || right === "") { return false; }
        if (left === "." || right === ".") { return false; }
        if (left === "<ENTER>" || right === "<ENTER>") { return false; }
        if (left === "(" || right === ")") { return false; }
        if (left === "[" || right === "]") { return false; }
        if (right === "[") { return false; }
        if (left.match(ID_REGEX) && right === "(") { return false; }
        if (right === ";") { return false; }
        if (!left.match(ID_REGEX) && !right.match(ID_REGEX)) { return false; }
        if (right === "<" || right === ">") { return left.charAt(0).toLowerCase() === left.charAt(0); }
        if (left === "++" || right === "++") { return false; }
        if (left === "--" || right === "--") { return false; }
        if (left === "<" || left === ">") {
            left = nextI < 2 ? "A" : tokens[nextI - 2];
            return left.charAt(0).toLowerCase() === left.charAt(0);
        }
        return true;
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        let stringBuilder = "";
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            stringBuilder += (c);
            if (c === '"') {
                i++;
                const strStart = i;
                for (; i < s.length; i++) {
                    if (s.charAt(i) === '"') {
                        break;
                    }
                    if (s.charAt(i) === "\\") {
                        i++;
                    }
                }
                const strContent = s.substring(strStart, i);
                if (trivialLiterals.has(strContent)) {
                    stringBuilder += (strContent);
                }
                stringBuilder += ("\"");

            } else if (c === "'") {
                i++;
                const strStart = i;
                for (; i < s.length; i++) {
                    stringBuilder += (s.charAt(i));
                    if (s.charAt(i) === "'") {
                        break;
                    }
                    if (s.charAt(i) === "\\") {
                        i++;
                    }
                }
                const strContent = s.substring(strStart, i);
                if (trivialLiterals.has(strContent)) {
                    stringBuilder += (strContent);
                }
                stringBuilder += ("'");
            }
        }
        return stringBuilder.toString();
    }
}
