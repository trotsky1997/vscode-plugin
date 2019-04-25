import * as crypto from "crypto";
import * as request from "request-promise";
import * as vscode from "vscode";
import { localize } from "./extension";
import log from "./logger";
import Preference from "./Preference";
import CodeStore from "./utils/CodeStore";
import DataMasking from "./utils/DataMasking";

function md5Hash(s: string) {
    return crypto.createHash("md5").update(s).digest("hex");
}

// const HttpsAgent = require("agentkeepalive").HttpsAgent;

// const keepaliveAgent = new HttpsAgent();
function myRequest(options: request.OptionsWithUrl) {
    const proxyUrl: string = vscode.workspace.getConfiguration().get("http.proxy");
    const proxyAuth: string = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
    const proxyStrictSSL: boolean = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
    let endpoint: string = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
    let host = proxyUrl || endpoint.substring(endpoint.indexOf("://") + 3);
    if (host.indexOf("/") >= 0) {
        host = host.substr(0, host.indexOf("/"));
    }
    if (!endpoint.endsWith("/")) {
        endpoint += "/";
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
    };
    return request(options);
}

export async function predict(text: string, ext: string, remainingText: string, lastQueryUUID: number, fileID: string) {
    const maskedText = await DataMasking.mask(text, ext);
    const maskedRemainingText = await DataMasking.mask(remainingText, ext);
    const u = vscode.window.activeTextEditor.document.uri;
    const proj = vscode.workspace.getWorkspaceFolder(u);
    const offset = CodeStore.getInstance().getDiffPosition(fileID, maskedText);
    const md5 = md5Hash(maskedText);

    return myRequest({
        method: "post",
        url: "predict",
        form: {
            text: maskedText,    // 这个是输入的内容，暂时先用p来代替
            ext,
            uuid: Preference.uuid,
            fileid: fileID,
            project: proj ? proj.name : "_scratch",
            remaining_text: maskedRemainingText,
            queryUUID: lastQueryUUID,
            offset,
            md5,
            sort: 1,
            prob_th_ngram: 1,
            prob_th_ngram_t: 1,
        },
        timeout: 2000,
    });
}

export function getTrivialLiterals(ext: string) {
    return myRequest({
        method: "get",
        url: "trivial_literals?uuid=" + Preference.uuid + "&ext=" + ext,
        timeout: 2000,
    });
}

function compareVersion(v1: any, v2: any) {
    if (typeof v1 !== "string") { return false; }
    if (typeof v2 !== "string") { return false; }
    v1 = v1.split(".");
    v2 = v2.split(".");
    const k = Math.min(v1.length, v2.length);
    for (let i = 0; i < k; ++i) {
        v1[i] = parseInt(v1[i], 10);
        v2[i] = parseInt(v2[i], 10);
        if (v1[i] > v2[i]) { return 1; }
        if (v1[i] < v2[i]) { return -1; }
    }
    return v1.length === v2.length ? 0 : (v1.length < v2.length ? -1 : 1);
}

export async function checkUpdate() {
    try {
        const updateURL = "https://www.aixcoder.com/download/installtool/aixcoderinstaller_aixcoder.json";
        const versionJson = await request(updateURL);
        let newVersions = JSON.parse(versionJson);
        newVersions = process.platform === "win32" ? newVersions.win : newVersions.mac;
        const ignoredVersion = Preference.context.globalState.get("aiXcoder.ignoredUpdateVersion");
        const v = newVersions.vscode.version;
        if (ignoredVersion === v) {
            return;
        }
        const myVersion = vscode.extensions.getExtension("nnthink.aixcoder").packageJSON.version;
        if (compareVersion(myVersion, v) < 0) {
            log("New aiXCoder version is available: " + v);
            const select = await vscode.window.showInformationMessage(localize("newVersion") + v, localize("download"), localize("ignoreThisVersion"));
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
