export const ID_REGEX = /^[a-zA-Z_][a-zA-Z_0-9]*$/;

export class LangUtil {
    public render(tokens: string[], start: number): string {
        let r = "";
        for (let i = start; i < tokens.length; i++) {
            let token = tokens[i];
            if (token === "<ENTER>") {
                token = "\n";
            } else if (token === "<IND>") {
                token = "";
            } else if (token === "<UNIND>") {
                token = "";
            } else if (token === "<BREAK>") {
                token = "";
            }
            if (token !== "" && i > 0 && this.hasSpaceBetween(tokens, i)) {
                r += " ";
            }
            r += token;
        }
        return r;
    }

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
        return true;
    }
}
