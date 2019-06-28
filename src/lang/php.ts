import { LangUtil } from "./langUtil";

export class PhpLangUtil extends LangUtil {
    constructor() {
        super();
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        return s;
    }

    public hasSpaceBetween(tokens: string[], nextI: number): boolean {
        const left = nextI === 0 ? "" : tokens[nextI - 1];
        const right = tokens[nextI];
        if (right === ":") { return false; }
        if (left === "$") { return false; }
        if (left === "!") { return false; }
        return super.hasSpaceBetween(tokens, nextI);
    }
}
