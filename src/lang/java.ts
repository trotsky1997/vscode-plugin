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
        if (left === "<" || left === ">") {
            left = nextI < 2 ? "A" : tokens[nextI - 2];
            return left.charAt(0).toLowerCase() === left.charAt(0);
        }
        return true;
    }
}
