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

    public render(tokens: string[], start: number): string {
        let r = "";
        for (let i = start; i < tokens.length; i++) {
            let token = tokens[i];
            if (token in this.tags2str) {
                token = this.tags2str[token];
            }
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

    public datamask(s: string, trivialLiterals: Set<string>): string {
        throw new Error("Not implemented");
    }
}
