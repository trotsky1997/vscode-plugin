import { ID_REGEX, LangUtil } from "./langUtil";

export class PythonLangUtil extends LangUtil {
    constructor() {
        super();
        this.tags2str["<bool>"] = "True";
        this.tags2str["<null>"] = "None";
    }

    public skipString(i: number, s: string, trivialLiterals: Set<string>, stringBuilder: string, char: string) {
        const c = s.charAt(i);
        const pythonDoc = c === s.charAt(i + 1) && c === s.charAt(i + 2);
        if (pythonDoc) {
            i += 2;
        }
        i++;
        const strStart = i;
        for (; i < s.length; i++) {
            if (pythonDoc) {
                if (s.startsWith(c + c + c, i)) {
                    break;
                }
            } else {
                if (s.charAt(i) === char) {
                    break;
                }
                if (s.charAt(i) === "\\") {
                    i++;
                }
            }
        }
        const strContent = s.substring(strStart, i);
        if (trivialLiterals.has(strContent)) {
            stringBuilder += strContent;
        }
        stringBuilder += char;
        return { i, stringBuilder };
    }

    public datamask(s: string, trivialLiterals: Set<string>): string {
        let stringBuilder = "";
        for (let i = 0; i < s.length; i++) {
            const c = s.charAt(i);
            stringBuilder += (c);
            if (c === '"' || c === "'") {
                const _ = this.skipString(i, s, trivialLiterals, stringBuilder, c);
                i = _.i;
                stringBuilder = _.stringBuilder;
            }
        }
        return stringBuilder.toString();
    }

    public hasSpaceBetween(tokens: string[], nextI: number): boolean {
        const left = nextI === 0 ? "" : tokens[nextI - 1];
        const right = tokens[nextI];
        if (right === ":") { return false; }
        return super.hasSpaceBetween(tokens, nextI);
    }
}
