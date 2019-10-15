import * as crypto from "crypto";
import * as request from "request-promise";
import * as vscode from "vscode";
import { compareVersion, myVersion } from "./extension";
import { localize } from "./i18n";
import { LangUtil } from "./lang/langUtil";
import log from "./logger";
import Preference from "./Preference";
import CodeStore from "./utils/CodeStore";
import DataMasking from "./utils/DataMasking";

function md5Hash(s: string) {
    return crypto.createHash("md5").update(s).digest("hex");
}

// const HttpsAgent = require("agentkeepalive").HttpsAgent;

// const keepaliveAgent = new HttpsAgent();
function myRequest(options: request.OptionsWithUrl, endpoint?: string) {
    const proxyUrl: string = vscode.workspace.getConfiguration().get("http.proxy");
    const proxyAuth: string = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
    const proxyStrictSSL: boolean = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
    endpoint = endpoint || vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
    let host = proxyUrl || endpoint.substring(endpoint.indexOf("://") + 3);
    if (host.indexOf("/") >= 0) {
        host = host.substr(0, host.indexOf("/"));
    }
    if (!endpoint.endsWith("/")) {
        endpoint += "/";
    }
    if (options.headers) {
        for (const headerKey in options.headers) {
            if (options.headers.hasOwnProperty(headerKey)) {
                options.headers[headerKey] = encodeURIComponent(options.headers[headerKey]);
            }
        }
    }
    options = {
        ...options,
        url: endpoint + options.url,
        headers: {
            ...options.headers,
            "Proxy-Authorization": proxyAuth,
        },
        proxy: proxyUrl,
        strictSSL: proxyStrictSSL,
        // agent: keepaliveAgent,
        timeout: 1000,
    };
    return request(options);
}

const realExtension = {
    python: "py",
    javascript: "js",
    typescript: "ts",
};

export async function predict(langUtil: LangUtil, text: string, ext: string, remainingText: string, lastQueryUUID: number, fileID: string, retry = true) {
    const maskedText = await DataMasking.mask(langUtil, text, ext);
    const maskedRemainingText = await DataMasking.mask(langUtil, remainingText, ext);
    const u = vscode.window.activeTextEditor.document.uri;
    const proj = vscode.workspace.getWorkspaceFolder(u);
    const projName = proj ? proj.name : "_scratch";
    const offset = CodeStore.getInstance().getDiffPosition(fileID, maskedText);
    const md5 = md5Hash(maskedText);

    try {
        if (fileID.match(/^Untitled-\d+$/)) {
            const lang = ext.substring(ext.indexOf("(") + 1, ext.length - 1).toLowerCase();
            fileID += "." + (realExtension[lang] || lang);
        }
        const resp = await myRequest({
            method: "post",
            url: "predict",
            form: {
                text: maskedText.substring(offset),    // 这个是输入的内容，暂时先用p来代替
                ext,
                uuid: Preference.uuid,
                fileid: fileID,
                project: projName,
                remaining_text: maskedRemainingText,
                queryUUID: lastQueryUUID,
                offset,
                md5,
                sort: 1,
                const: 1,
                prob_th_ngram: 1,
                prob_th_ngram_t: 1,
                version: myVersion,
                long_result_cuts: Preference.getLongResultCuts(),
                ...Preference.getRequestParams(),
            },
            headers: {
                ext,
                uuid: Preference.uuid,
            },
            timeout: 2000,
        });
        if (retry && resp && resp.indexOf("Conflict") >= 0) {
            console.log("conflict");
            CodeStore.getInstance().invalidateFile(projName, fileID);
            return predict(langUtil, text, ext, remainingText, lastQueryUUID, fileID, false);
        } else {
            console.log("resp=" + resp);
            CodeStore.getInstance().saveLastSent(projName, fileID, maskedText);
        }
        return resp;
    } catch (e) {
        if (e.message && e.message.indexOf("Conflict") >= 0) {
            CodeStore.getInstance().invalidateFile(projName, fileID);
            return predict(langUtil, text, ext, remainingText, lastQueryUUID, fileID, false);
        }
        log(e);
    }
    return null;
}

export function getTrivialLiterals(ext: string) {
    return myRequest({
        method: "get",
        url: "trivial_literals?uuid=" + encodeURIComponent(Preference.uuid) + "&ext=" + ext,
        timeout: 2000,
    });
}

export async function checkUpdate() {
    try {
        const updateURL = "download/installtool/aixcoderinstaller_aixcoder.json";
        const versionJson = await myRequest({
            method: "get",
            url: updateURL,
        }, "https://www.aixcoder.com");
        let newVersions = JSON.parse(versionJson);
        newVersions = process.platform === "win32" ? newVersions.win : newVersions.mac;
        const ignoredVersion = Preference.context.globalState.get("aiXcoder.ignoredUpdateVersion");
        const v = newVersions.vscode.version;
        if (ignoredVersion === v) {
            return;
        }
        if (compareVersion(myVersion, v) < 0) {
            log("New aiXCoder version is available: " + v);
            const select = await vscode.window.showInformationMessage(localize("newVersion", v), localize("download"), localize("ignoreThisVersion"));
            if (select === localize("download")) {
                await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://www.aixcoder.com/download/installtool"));
            } else if (select === localize("ignoreThisVersion")) {
                Preference.context.globalState.update("aiXcoder.ignoredUpdateVersion", v);
            }
        } else {
            log("AiXCoder is up to date");
        }
    } catch (e) {
        log(e);
    }
}

export enum TelemetryType {
    LongShow = "001",
    ShortShow = "002",
    LongUse = "003",
    ShortUse = "004",
    SystemShow = "005",
    SystemUse = "007",
    UseLength = "008",
}

export async function sendTelemetry(ext: string, type: TelemetryType, tokenNum = 0, charNum = 0) {
    const telemetry = vscode.workspace.getConfiguration().get("aiXcoder.enableTelemetry");
    if (telemetry) {
        console.log("send telemetry: " + type + "/" + tokenNum + "/" + charNum);
        try {
            const updateURL = `user/predict/userUseInfo`;
            await myRequest({
                method: "post",
                url: updateURL,
                form: {
                    type,
                    area: ext,
                    uuid: Preference.uuid,
                    plugin_version: myVersion,
                    ide_version: vscode.version,
                    ide_type: "vscode",
                    token_num: tokenNum,
                    char_num: charNum,
                },
            });
        } catch (e) {
            log(e);
        }
    }
}

export async function sendErrorTelemetry(msg: string) {
    // const telemetry = vscode.workspace.getConfiguration().get("aiXcoder.enableTelemetry");
    // if (telemetry) {
    //     try {
    //         const updateURL = `/user/predict/err?uuid=${Preference.uuid}&client=vscode&msg=${encodeURIComponent(msg)}`;
    //         await myRequest({
    //             method: "get",
    //             url: updateURL,
    //         });
    //     } catch (e) {
    //         log(e, false);
    //     }
    // }
}

export async function getModels(): Promise<string[]> {
    try {
        const updateURL = `getmodels`;
        const models = await myRequest({
            method: "get",
            url: updateURL,
        });
        return JSON.parse(models);
    } catch (e) {
        log(e);
    }
    return [];
}
