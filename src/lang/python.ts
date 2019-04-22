import { LangUtil } from "./langUtil";

export class PythonLangUtil extends LangUtil {
    constructor() {
        super();
        this.tags2str["<bool>"] = "True";
        this.tags2str["<null>"] = "None";
    }

    public skipString(i: number, s: string, trivialLiterals: Set<string>, stringBuilder: string, char: string) {
        i++;
        const strStart = i;
        for (; i < s.length; i++) {
            if (s.charAt(i) === char) {
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
}
