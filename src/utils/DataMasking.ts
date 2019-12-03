import * as API from "../API";
import { getInstance } from "../lang/commons";
import { LangUtil } from "../lang/langUtil";

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
    public static async mask(langUtil: LangUtil, s: string, ext: string): Promise<string> {
        return s;
    }
}
