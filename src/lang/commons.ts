import { CppLangUtil } from "./cpp";
import { JavaLangUtil } from "./java";
import { JavaScriptLangUtil } from "./javascript";
import { LangUtil } from "./langUtil";
import { PhpLangUtil } from "./php";
import { PythonLangUtil } from "./python";
import { TypeScriptLangUtil } from "./typescript";

export function getInstance(lang: string): LangUtil {
    switch (lang) {
        case "python":
            return new PythonLangUtil();
        case "java":
            return new JavaLangUtil();
        case "cpp":
            return new CppLangUtil();
        case "php":
            return new PhpLangUtil();
        case "js":
            return new JavaScriptLangUtil();
        case "ts":
            return new TypeScriptLangUtil();
        default:
            throw new Error(`unsuppored language ${lang}`);
    }
}
