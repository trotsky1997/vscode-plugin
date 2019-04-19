import { JavaLangUtil } from "./java";
import { LangUtil } from "./langUtil";
import { PythonLangUtil } from "./python";

export function getInstance(lang: string): LangUtil {
    switch (lang) {
        case "python":
            return new PythonLangUtil();
        case "java":
            return new JavaLangUtil();
        default:
            throw new Error(`unsuppored language ${lang}`);
    }
}
