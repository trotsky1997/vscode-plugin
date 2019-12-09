import { CppLangUtil } from "./cpp";
import { GoLangUtil } from "./go";
import { JavaLangUtil } from "./java";
import { JavaScriptLangUtil } from "./javascript";
import { LangUtil } from "./langUtil";
import { PhpLangUtil } from "./php";
import { PythonLangUtil } from "./python";
import { TypeScriptLangUtil } from "./typescript";

const instances = new Map();
function _getInstance(lang: string): LangUtil {
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
        case "go":
            return new GoLangUtil();
        default:
            throw new Error(`unsupported language ${lang}`);
    }
}

export function getInstance(lang: string): LangUtil {
    if (instances.has(lang)) {
        return instances.get(lang);
    }
    const instance = _getInstance(lang);
    instances.set(lang, instance);
    return instance;
}
