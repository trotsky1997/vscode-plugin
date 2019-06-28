import { CppLangUtil } from "./cpp";
import { JavaLangUtil } from "./java";
import { LangUtil } from "./langUtil";
import { PhpLangUtil } from "./php";
import { PythonLangUtil } from "./python";

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
        default:
            throw new Error(`unsuppored language ${lang}`);
    }
}
