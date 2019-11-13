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
        "en": "AiXCoder is in compability mode because MS IntelliCode Extension is installed. Results from aiXcoder will be ranked lower when IntelliCode results are avaialble.",
        "zh-cn": "AiXCoder正处于兼容模式因为微软IntelliCode插件已被安装。在IntelliCode插件提供推荐结果时AiXCoder的推荐结果位置将下移。",
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
    "php.fail.msphp": {
        "en": "PHP Extension integration failed. Please ensure you have latest version of aiXcoder.",
        "zh-cn": "PHP 集成失败。请确保您安装了最新版本的aiXcoder插件。",
    },
    "php.reload.msphp": {
        "en": "AiXCoder requires a reload to integrate with PHP extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 PHP 集成。",
    },
    "php.fail.intelephense": {
        "en": "PHP Intelephense Extension integration failed. Please ensure you have latest version of aiXcoder.",
        "zh-cn": "PHP Intelephense 集成失败。请确保您安装了最新版本的aiXcoder插件和Intelephense插件。",
    },
    "php.reload.intelephense": {
        "en": "AiXCoder requires a reload to integrate with PHP Intelephense extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 PHP Intelephense 集成。",
    },
    "intelephense.install": {
        "en": "AiXCoder: PHP Intelephense is not installed or enabled. Please install PHP Intelephense for the best experience.",
        "zh-cn": "AiXCoder: PHP Intelephense 插件没有安装或启用。请安装 PHP Intelephense 插件以获得最佳体验。",
    },
    "hookFailPerm": {
        "en": "AiXCoder integration failed. Please restart VS Code in administator mode (only needed once before next time VS Code updates itself).",
        "zh-cn": "AiXCoder集成失败，请以管理员权限启动VS Code以重试（VS Code更新之前只需要一次）。",
    },
    "hookFailOther": {
        "en": "AiXCoder integration failed. Cause: %s",
        "zh-cn": "AiXCoder集成失败，原因：%s",
    },
    "js.fail.msts": {
        "en": "JavaScript/TypeScript integration failed. Please ensure you have latest version of aiXcoder and VS Code.",
        "zh-cn": "JavaScript/TypeScript 集成失败。请确保您安装了最新版本的aiXcoder插件和VS Code。",
    },
    "js.reload.msts": {
        "en": "AiXCoder requires a reload to integrate with JavaScript/TypeScript extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 JavaScript/TypeScript 集成。",
    },
    "java.redhat.loading": {
        "en": "redhat.java extension is still being loaded, please wait...",
        "zh-cn": "redhat.java 插件还在加载中，请稍后...",
    },
    "locateIDE": {
        "en": "Visual Studio Code is launched from a temporary folder. Please locate the actual \"Visual Studio Code.app\" application for aiXcoder to integrate with.",
        "zh-cn": "Visual Studio Code是从一个临时目录启动的。请定位Visual Studio Code.app的实际位置以便aiXcoder进行集成。",
    },
    "locate": {
        "en": "Locate...",
        "zh-cn": "定位...",
    },
    "locateDialog": {
        "en": "Locate",
        "zh-cn": "定位...",
    },
    "needAdmin": {
        "en": "Please restart Visual Studio Code with Administrator Priviledges to finish the integration (you only need to do it once).",
        "zh-cn": "请使用管理员权限启动Visual Studio Code以完成集成（您只需要做一次）。",
    },
    "go.fail": {
        "en": "Go integration failed. Please ensure you have latest version of aiXcoder and VS Code.",
        "zh-cn": "Go 集成失败。请确保您安装了最新版本的aiXcoder插件和VS Code。",
    },
    "go.reload": {
        "en": "AiXCoder requires a reload to integrate with Go extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 GO 集成。",
    },
    "msgoExtension.install": {
        "en": "AiXCoder: Go Extension is not installed or enabled. Please install Go Extension for the best experience.",
        "zh-cn": "AiXCoder: Go 插件没有安装或启用。请安装 Go 插件以获得最佳体验。",
    },
    "msgsearchfirsttime": {
        "en": "You can have search results displayed in an external browser by specifying it in the settings.",
        "zh-cn": "您可以在一个外部浏览器窗口中显示搜索结果，只需要在设置中进行设置。",
    },
    "localServerDown": {
        "en": "The local aiXcoder server is not responding. Please open the aiXcoder app and make sure the local server is running on %s.",
        "zh-cn": "本地aiXcoder服务器没有响应。请打开aiXcoder应用并确保本地服务器运行在 %s 上。",
    },
    "serverDown": {
        "en": "The aiXcoder server is not responding. Please make sure you have a stable network connection to %s.",
        "zh-cn": "aiXcoder服务器没有响应。请确保您有一个稳定的可以访问%s的网络。",
    },
    "java.fail": {
        "en": "Java integration failed. Please ensure you have latest version of aiXcoder and VS Code.",
        "zh-cn": "Java 集成失败。请确保您安装了最新版本的aiXcoder插件和VS Code。",
    },
    "java.reload": {
        "en": "AiXCoder requires a reload to integrate with Java extension.",
        "zh-cn": "AiXCoder需要重新加载以便与 Java 集成。",
    },
    "manualTryStartLocalService": {
        "en": "Restart Service",
        "zh-cn": "重启服务",
    },
    "localServiceStarting" : {
        "en": "Local service is starting. It will take up to a minute to warm up.",
        "zh-cn": "本地服务正在启动。可能需要不超过一分钟的时间来预热。",
    },
    "unableToLogin": {
        "en": "Unable to check login status. Please open aiXcoder main app to login. And then restart vscode.",
        "zh-cn": "无法检查登录状态。请打开aiXcoder主程序继续登录。然后重启vscode。",
    },
    "notProfessionalEdition": {
        "en": "You are using community version of aiXcoder. Features in Professional Edition is not available.",
        "zh-cn": "您使用的不是专业版，无法使用专业版功能。",
    },
    "login": {
        "en": "Login...",
        "zh-cn": "登录...",
    },
    "learnProfessional": {
        "en": "learn more...",
        "zh-cn": "了解更多...",
    },
    "openAixcoderUrlFailed": {
        "en": "Unable to open aixcoder protocol. This might be due to the original app being moved or deleted. Please open aixcoder app. And then reload VSCode.",
        "zh-cn": "无法打开aixcoder协议，这可能是由于应用程序被移动或删除导致。请重新打开aixcoder应用。然后重新加载VSCode。",
    },
    "aixUpdateProgress": {
        "en": "Downloading aiXcoder service...",
        "zh-cn": "正在下载aiXcoder服务...",
    },
    "aixUpdatefailed" : {
        "en": "aiXcoder service update failed. You can manually download the latest service zipfile/tarball from: [](%s). And then unzip it here: %s.",
        "zh-cn": "aiXcoder服务更新失败。您可以手动在此下载最新的压缩包：[](%s)。然后解压到这个目录：%s。",
    },
};

export function localize(key: string, ...params: any[]) {
    return localizeMessages[key] ? util.format(localizeMessages[key][vscode.env.language] || localizeMessages[key].en, ...params) : key;
}
