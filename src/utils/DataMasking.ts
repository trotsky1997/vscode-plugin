import * as API from "../API";
import { getInstance } from "../lang/commons";

/**
 * 数据脱敏
 */
export default class DataMasking {
    /**
     * 不需要脱敏的简单字符串，lazy loading
     */
    public static trivialLiterals: Set<string>;

    /**
     * 字符串脱敏，将除trivialLiterals里的简单字符串以外的其它字符串变成空字符串
     *
     * @param s 原始字符串
     * @return 脱敏后字符串
     */
    public static async mask(s: string, ext: string): Promise<string> {
        if (DataMasking.trivialLiterals == null) {
            try {
                DataMasking.trivialLiterals = new Set<string>();
                const literals: string[] = JSON.parse(await API.getTrivialLiterals(ext));
                for (const lit of literals) {
                    if (lit.startsWith("<str>")) {
                        DataMasking.trivialLiterals.add(lit.substring("<str>".length).replace("<str_space>", " "));
                    }
                }
            } catch (e) {
                console.log(e);
            }
            return s;
        } else {
            return getInstance("java").datamask(s, DataMasking.trivialLiterals);
        }
    }
}
