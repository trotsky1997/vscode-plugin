import * as util from "util";
import * as vscode from "vscode";

export const localizeMessages: { [key: string]: { en: string, "zh-cn": string } } = {
    "mspythonExtension.install": {
        "en": "AiXCoder: Microsoft Python extension is not installed or enabled. Please install Microsoft Python extension for the best experience.",
        "zh-cn": "AiXCoder: Microsoft Python 插件没有安装或启用。请安装 Microsoft Python 插件以获得最佳体验。",
    },
    "assembly.load.fail": {
        "en": "AiXCoder: assembly load failed, reason: ",
        "zh-cn": "AiXCoder: 程序集加载失败，原因：",
    },
    "reload": {
        "en": "Reload",
        "zh-cn": "重新加载",
    },
    "mspythonExtension.activate.fail": {
        "en": "AiXCoder: Microsoft Python extension activate failed, reason: ",
        "zh-cn": "AiXCoder: Microsoft Python 插件启动失败，原因：",
    },
    "action.install": {
        "en": "Install...",
        "zh-cn": "安装...",
    },
    "redhatjavaExtension.activate.fail": {
        "en": "AiXCoder: Language Support for Java(TM) by Red Hat activate failed, reason: ",
        "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 启动失败，原因：",
    },
    "redhatjavaExtension.install": {
        "en": "AiXCoder: Language Support for Java(TM) by Red Hat is not installed or enabled. Please install Language Support for Java(TM) by Red Hat for the best experience.",
        "zh-cn": "AiXCoder: Language Support for Java(TM) by Red Hat 插件没有安装或启用。请安装 Language Support for Java(TM) by Red Hat 插件以获得最佳体验。",
    },
    "mscpptoolsExtension.install": {
        "en": "AiXCoder: C/C++ Extension is not installed or enabled. Please install C/C++ Extension for the best experience.",
        "zh-cn": "AiXCoder: C/C++ 插件没有安装或启用。请安装 C/C++ 插件以获得最佳体验。",
    },
    "newVersion": {
        "en": "A new aiXcoder version is available: %s, update now?",
        "zh-cn": "发现一个新的aiXcoder版本：%s，现在更新？",
    },
    "download": {
        "en": "Update",
        "zh-cn": "更新",
    },
    "ignoreThisVersion": {
        "en": "Ignore this version",
        "zh-cn": "忽略这个版本",
    },
    "aiXcoder.askedTelemetry": {
        "en": "AiXCoder will send anonymous usage data to improve user experience. You can disable it in settings by turning off aiXcoder.enableTelemetry. (Current: %s)",
        "zh-cn": "AiXCoder会发送匿名使用数据以提升用户体验。您可以在设置中关闭aiXcoder.enableTelemetry项来停止此行为。(当前：%s)",
    },
    "openSetting": {
        "en": "Open Settings...",
        "zh-cn": "打开设置...",
    },
    "aiXcoder.askedTelemetryOK": {
        "en": "OK",
        "zh-cn": "知道了",
    },
    "aiXcoder.askedTelemetryNo": {
        "en": "Don't send my usage data",
        "zh-cn": "不要发送我的使用数据",
    },
    "cpp.reload": {
        "en": "AiXCoder requires a reload to integrate with C/C++ extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 C/C++ 插件集成。",
    },
    "cpp.fail": {
        "en": "C/C++ Extension integration failed. Please ensure you have latest version of aiXcoder and C/C++ Extension installed.",
        "zh-cn": "C/C++ 插件集成失败。请确保您安装了最新版本的aiXcoder插件以及C/C++插件。",
    },
    "aiXcoder.endpoint.empty": {
        "en": "AiXCoder server endpoint is not set.",
        "zh-cn": "AiXCoder服务器端口未设置。",
    },
    "enabled": {
        "en": "Enabled",
        "zh-cn": "已启用",
    },
    "disabled": {
        "en": "Disabled",
        "zh-cn": "已关闭",
    },
    "python.fail": {
        "en": "Python Extension integration failed. Please ensure you have latest version of aiXcoder and Python Extension installed.",
        "zh-cn": "Python 插件集成失败。请确保您安装了最新版本的aiXcoder插件以及Python插件。",
    },
    "python.reload": {
        "en": "AiXCoder requires a reload to integrate with Python extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 Python 插件集成。",
    },
    "msintellicode.enabled": {
        "en": "AiXCoder is in compability mode because MS IntelliCode Extension is installed. Results from aiXcoder will not be shown when IntelliCode results are avaialble.",
        "zh-cn": "AiXCoder正处于兼容模式因为微软IntelliCode插件已被安装。在IntelliCode插件提供推荐结果时AiXCoder的推荐结果将被隐藏。",
    },
    "nevershowagain": {
        "en": "Don't show again",
        "zh-cn": "不再显示",
    },
    "model.switch": {
        "en": "Model for %s has been switched to %s.",
        "zh-cn": "%s 的模型已被切换到 %s。",
    },
    "msgreset": {
        "en": "All messages are reset. You will see previously disabled notifications.",
        "zh-cn": "所有消息都被重置。您可以看到之前被禁用的提醒了。",
    },
};
export function localize(key: string, ...params: any[]) {
    return localizeMessages[key] ? util.format(localizeMessages[key][vscode.env.language] || localizeMessages[key].en, ...params) : key;
}
