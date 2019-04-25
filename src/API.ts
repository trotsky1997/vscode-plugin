import * as crypto from "crypto";
import * as request from "request-promise";
import * as vscode from "vscode";
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
