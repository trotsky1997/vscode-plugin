import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as request from "request-promise";
import * as vscode from "vscode";
import { compareVersion, myVersion, showInformationMessage, showInformationMessageOnce, showWarningMessage } from "./extension";
import { localize } from "./i18n";
import { LangUtil } from "./lang/langUtil";
import Learner from "./Learner";
import { forceUpdate, getVersion, openurl } from "./localService";
import log from "./logger";
import NetworkController from "./NetworkController";
import Preference from "./Preference";
import CodeStore from "./utils/CodeStore";
import DataMasking from "./utils/DataMasking";

function md5Hash(s: string) {
    return crypto.createHash("md5").update(s).digest("hex");
}

const homedir = os.homedir();
const localserver = path.join(homedir, "aiXcoder", "localserver.json");
let models = {};
let lastCheckLocalTime = 0;
function readFile() {
    if (Date.now() - lastCheckLocalTime < 1000 * 5) {
        return;
    }
    lastCheckLocalTime = Date.now();
    fs.readFile(localserver, "utf-8").then((data) => {
        const d = JSON.parse(data);
        models = {};
        for (const model of d.models) {
            models[model.name] = model;
        }
    });
}

readFile();
setInterval(readFile, 1000 * 60 * 5);
async function initWatch() {
    try {
        await fs.stat(localserver);
    } catch (e) {
        await fs.writeFile(localserver, "{}", "utf-8");
    }
    fs.watch(localserver, (event, filename) => {
        readFile();
    });
}
initWatch();

async function myRequest(options: request.OptionsWithUrl, endpoint?: string) {
    const proxyUrl: string = vscode.workspace.getConfiguration().get("http.proxy");
    const proxyAuth: string = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
    const proxyStrictSSL: boolean = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
    if (!endpoint) {
        endpoint = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
    }
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

const networkController = new NetworkController();
const localNetworkController = new NetworkController();

let lastLocalRequest = false;
let firstLocalRequestAttempt = true;
let learner: Learner;

export async function predict(langUtil: LangUtil, text: string, ext: string, remainingText: string, laterCode: string, lastQueryUUID: number, fileID: string, retry = true) {
    if (Preference.getSelfLearn()) {
        if (Preference.isProfessional === undefined) {
            // showInformationMessageOnce("unableToLogin", "login").then((selection) => {
            //     if (selection === "login") {
            //         openurl(`aixcoder://login`);
            //     }
            // });
        } else if (Preference.isProfessional) {
            if (learner == null) {
                learner = new Learner();
            }
            learner.learn(ext, fileID);
        } else {
            showInformationMessageOnce("notProfessionalEdition", "learnProfessional").then((selection) => {
                if (selection === "learnProfessional") {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://www.aixcoder.com/#/Product?tab=0"));
                }
            });
        }
    }
    let localRequest = false;
    let endpoint: string | undefined;
    if (models[ext] && models[ext].active && models[ext].url) {
        endpoint = models[ext].url;
        lastLocalRequest = localRequest = true;
        log("LOCAL!");
    } else {
        lastLocalRequest = localRequest = false;
        endpoint = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
        if (!networkController.shouldPredict()) {
            return null;
        }
    }
    const maskedText = await DataMasking.mask(langUtil, text, ext);
    const maskedRemainingText = await DataMasking.mask(langUtil, remainingText, ext);
    const u = vscode.window.activeTextEditor.document.uri;
    const proj = vscode.workspace.getWorkspaceFolder(u);
    const projName = proj ? proj.name : "_scratch";
    const offset = CodeStore.getInstance().getDiffPosition(fileID, maskedText);
    const md5 = md5Hash(maskedText);

    try {
        if (fileID.match(/^Untitled-"d",+$/)) {
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
                laterCode: localRequest ? laterCode : "",
                long_result_cuts: Preference.getLongResultCuts(),
                ...Preference.getRequestParams(),
            },
            headers: {
                ext,
                uuid: Preference.uuid,
            },
            timeout: 2000,
        }, endpoint);
        if (retry && resp && resp.indexOf("Conflict") >= 0) {
            console.log("conflict");
            CodeStore.getInstance().invalidateFile(projName, fileID);
            return predict(langUtil, text, ext, remainingText, laterCode, lastQueryUUID, fileID, false);
        } else {
            console.log("resp=" + resp);
            CodeStore.getInstance().saveLastSent(projName, fileID, maskedText);
        }
        if (!localRequest) {
            networkController.onSuccess();
        } else {
            firstLocalRequestAttempt = false;
        }
        return resp;
    } catch (e) {
        if (e.message && e.message.indexOf("Conflict") >= 0) {
            CodeStore.getInstance().invalidateFile(projName, fileID);
            return predict(langUtil, text, ext, remainingText, laterCode, lastQueryUUID, fileID, false);
        }
        if (localRequest) {
            if (firstLocalRequestAttempt) {
                openurl(`aixcoder://localserver`);
                showInformationMessage("localServiceStarting");
                firstLocalRequestAttempt = false;
            } else {
                localNetworkController.onFailure(() => showWarningMessage(localize("localServerDown", endpoint), "manualTryStartLocalService").then((selection) => {
                    if (selection === "manualTryStartLocalService") {
                        openurl(`aixcoder://localserver`);
                        showInformationMessage("localServiceStarting");
                    }
                }));
            }
            readFile();
        } else {
            networkController.onFailure(() => showWarningMessage(localize("serverDown", endpoint)));
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
        const updateURL = "repos/aixcoder-plugin/localservice/releases/latest";
        const versionJson = await myRequest({
            method: "get",
            url: updateURL,
            headers: {
                "User-Agent": "aiXcoder-vscode-plugin",
            },
        }, "https://api.github.com");
        const newVersions = JSON.parse(versionJson);
        const v = newVersions.tag_name;
        const localVersion = await getVersion();
        let doUpdate = false;
        if (compareVersion(localVersion, v) < 0) {
            log("New aiXCoder version is available: " + v);
            doUpdate = true;
        } else {
            log("AiXCoder is up to date");
            doUpdate = false;
        }
        if (doUpdate) {
            forceUpdate();
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

export async function getUUID(): Promise<{ token: string, uuid: string }> {
    const loginFile = path.join(homedir, "aiXcoder", "login");
    const content = await fs.readFile(loginFile, "utf-8");
    const { token, uuid } = JSON.parse(content);
    return { token, uuid };
}

export async function isProfessional() {
    const { token, uuid } = await getUUID();
    const r = await myRequest({
        method: "post",
        url: "/aixcoderutil/plug/checkToken",
        form: {
            token,
        },
        timeout: 2000,
    }, "https://aixcoder.com");
    const res = JSON.parse(r);
    return res.level === 2;
}
