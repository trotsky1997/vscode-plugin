import * as crypto from "crypto";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as request from "request-promise";
import * as vscode from "vscode";
import { compareVersion, myVersion, showInformationMessageOnce, showWarningMessage, showWarningMessageOnce } from "./extension";
import { localize } from "./i18n";
import { LangUtil } from "./lang/langUtil";
import { MatchFailedError } from "./lang/MatchFailedError";
import Learner from "./Learner";
import { forceUpdate, getServiceStatus, getVersion, installerExists, isServerStarting, startLocalService, switchToLocal } from "./localService";
import log from "./logger";
import NetworkController from "./NetworkController";
import Preference from "./Preference";
import CodeStore from "./utils/CodeStore";
import DataMasking from "./utils/DataMasking";

function md5Hash(s: string) {
    return crypto.createHash("md5").update(s).digest("hex");
}

async function myRequest(options: request.OptionsWithUrl, endpoint: string) {
    const proxyUrl: string = vscode.workspace.getConfiguration().get("http.proxy");
    const proxyAuth: string = vscode.workspace.getConfiguration().get("http.proxyAuthorization");
    const proxyStrictSSL: boolean = vscode.workspace.getConfiguration().get("http.proxyStrictSSL");
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
        timeout: 1000,
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
    let r: string | null;
    try {
        r = await request(options);
    } catch (e) {
        log(`Error requesting ${(options.method || "GET").toUpperCase()} ${options.url}`);
        log(e);
        throw e;
    }
    return r;
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
let getServiceStatusLock = null;
let saStatusToken = { cancelled: false };
let saStatus = 0;

async function saStatusChecker(ext: string) {
    getServiceStatusLock = ext;
}

async function saStatusCheckerWorker() {
    while (true) {
        if (getServiceStatusLock !== null && lastLocalRequest) {
            saStatusToken.cancelled = true;
            saStatusToken = { cancelled: false };
            try {
                saStatus = await getServiceStatus(getServiceStatusLock);
            } catch (error) {
                // service not started
                await startLocalService(false);
                saStatus = 0;
            }
            if (saStatus <= 1) {
                await vscode.window.withProgress({
                    location: vscode.ProgressLocation.Window,
                    title: localize("localInitializing"),
                    cancellable: false,
                }, async (progress, token) => {
                    while (saStatus <= 1 && !saStatusToken.cancelled) {
                        if (!Preference.context.globalState.get("hide:localInitializing")) {
                            showWarningMessageOnce("localInitializing", "nosa-yes", "nosa-no").then((select) => {
                                if (select === "nosa-yes" || select === "nosa-no") {
                                    const allowIgnoreSaStatus = select === "nosa-yes";
                                    vscode.workspace.getConfiguration().update("aiXcoder.localShowIncompleteSuggestions", allowIgnoreSaStatus);
                                    showInformationMessageOnce(localize("localShowIncompleteSuggestions", localize(allowIgnoreSaStatus ? "nosa-yes" : "nosa-no").toLowerCase()));
                                    Preference.context.globalState.update("hide:localInitializing", true);
                                }
                            });
                        }
                        await new Promise((resolve) => setTimeout(resolve, 1000));
                        try {
                            saStatus = await getServiceStatus(getServiceStatusLock);
                        } catch (error) {
                            // service not started
                            startLocalService(false);
                            saStatus = 0;
                        }
                    }
                });
            }
        }
        await new Promise((resolve) => setTimeout(resolve, 3000));
    }
}
saStatusCheckerWorker();

function reverseString(str) {
    let newString = "";
    for (let i = str.length - 1; i >= 0; i--) {
        newString += str[i];
    }
    return newString;
}

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
    const endpoint = await Preference.getEndpoint(ext);
    if (endpoint.indexOf("localhost") >= 0) {
        lastLocalRequest = localRequest = true;
        if (isServerStarting()) {
            return null;
        }
        log("LOCAL!");
    } else {
        lastLocalRequest = localRequest = false;
        if (!networkController.shouldPredict()) {
            return null;
        }
    }

    saStatusChecker(ext);
    if (saStatus < 2 && !vscode.workspace.getConfiguration().get("aiXcoder.localShowIncompleteSuggestions")) {
        return null;
    }

    let maskedText: string;
    let maskedRemainingText: string;
    try {
        maskedText = await DataMasking.mask(langUtil, text, ext);
        maskedRemainingText = await DataMasking.mask(langUtil, remainingText, ext);
    } catch (error) {
        if (error instanceof MatchFailedError) {
            return null;
        }
        throw error;
    }
    const u = vscode.window.activeTextEditor.document.uri;
    const proj = vscode.workspace.getWorkspaceFolder(u);
    const projName = proj ? proj.name : "_scratch";
    const offset = CodeStore.getInstance().getDiffPosition(fileID, maskedText);
    const md5 = md5Hash(maskedText);
    ext = Preference.enterpriseExt(ext);
    const additionalParams: any = {};
    let laterCodeReversed;
    if (localRequest) {
        // additionalParams.fullCode = maskedText;
        laterCodeReversed = reverseString(laterCode);
        const laterOffset = CodeStore.getInstance().getDiffPosition(fileID + ".later", laterCodeReversed);
        additionalParams.laterMd5 = md5Hash(laterCodeReversed);
        const shortenedLaterCodeReversed = laterCodeReversed.substring(laterOffset);
        laterCode = reverseString(shortenedLaterCodeReversed);
        additionalParams.laterCode = laterCode;
        additionalParams.laterOffset = laterOffset;
        // additionalParams.fullLaterCode = laterCodeReversed;
    }

    try {
        if (fileID.match(/^Untitled-\d+$/)) {
            const lang = ext.substring(ext.indexOf("(") + 1, ext.length - 1).toLowerCase();
            fileID += "." + (realExtension[lang] || lang);
        }
        if (ext.endsWith("(Python)")) {
            additionalParams.saExecutor = vscode.workspace.getConfiguration().get("python.pythonPath");
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
                projectRoot: proj.uri.fsPath,
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
                ...additionalParams,
            },
            headers: {
                ext,
                uuid: Preference.uuid,
            },
            timeout: firstLocalRequestAttempt ? 10000 : 2000,
        }, endpoint);
        if (retry && resp && resp.indexOf("Conflict") >= 0) {
            console.log("conflict");
            CodeStore.getInstance().invalidateFile(projName, fileID);
            CodeStore.getInstance().invalidateFile(projName, fileID + ".later");
            return predict(langUtil, text, ext, remainingText, laterCode, lastQueryUUID, fileID, false);
        } else {
            console.log("resp=" + resp);
            CodeStore.getInstance().saveLastSent(projName, fileID, maskedText);
            if (localRequest) {
                CodeStore.getInstance().saveLastSent(projName, fileID + ".later", laterCodeReversed);
            }
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
                startLocalService(false);
                firstLocalRequestAttempt = false;
            } else {
                localNetworkController.onFailure(() => showWarningMessage(localize("localServerDown", endpoint), "manualTryStartLocalService").then((selection) => {
                    if (selection === "manualTryStartLocalService") {
                        startLocalService(true);
                    }
                }));
            }
            Preference.reloadLocalModelConfig();
        } else {
            networkController.onFailure(() => showWarningMessage(localize("serverDown", endpoint)));
        }
        log(e);
    }
    return null;
}

export async function getTrivialLiterals(ext: string) {
    const endpoint = await Preference.getEndpoint(ext);
    if (endpoint.indexOf("localhost") < 0) {
        return myRequest({
            method: "get",
            url: "trivial_literals?uuid=" + encodeURIComponent(Preference.uuid) + "&ext=" + ext,
            timeout: 2000,
        }, endpoint);
    }
    return "[]";
}

export async function checkUpdate() {
    try {
        const updateURL = Preference.remoteVersionUrl;
        const versionJson = await myRequest({
            method: "get",
            url: "",
        }, updateURL);
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
                await vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(Preference.installPage));
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

export async function checkLocalServiceUpdate() {
    if (await Preference.hasLoginFile()) {
        const mc = await Preference.getLocalModelConfig();
        let localActive = false;
        if (Object.keys(mc).length > 0) {
            for (const ext in mc) {
                if (mc.hasOwnProperty(ext)) {
                    localActive = mc[ext].active;
                    if (localActive) {
                        break;
                    }
                }
            }
        }
        if (!localActive) {
            log("Skip check update in online mode");
            return;
        }
    }
    try {
        let v = "0.0.0";
        try {
            const updateURL = "localservice/releases/latest";
            v = await myRequest({
                method: "get",
                url: updateURL,
                headers: {
                    "User-Agent": "aiXcoder-vscode-plugin",
                },
            }, "http://image.aixcoder.com");
        } catch (error) {
            const updateURL = "repos/aixcoder-plugin/localservice/releases/latest";
            const versionJson = await myRequest({
                method: "get",
                url: updateURL,
                headers: {
                    "User-Agent": "aiXcoder-vscode-plugin",
                },
            }, "https://api.github.com");
            const newVersions = JSON.parse(versionJson);
            v = newVersions.tag_name;
        }
        const localVersion = await getVersion();
        let doUpdate = false;
        if (compareVersion(localVersion, v) < 0) {
            log("New aiXCoder version is available: " + v + " local: " + localVersion);
            doUpdate = true;
        } else {
            log("AiXCoder is up to date");
            doUpdate = false;
        }
        if (doUpdate) {
            forceUpdate(localVersion, v);
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

export async function getModels(): Promise<string[]> {
    try {
        const updateURL = `getmodels`;
        const models = await myRequest({
            method: "get",
            url: updateURL,
        }, await Preference.getEndpoint());
        return JSON.parse(models);
    } catch (e) {
        log(e);
    }
    return [];
}

export async function getUUID(): Promise<{ token: string, uuid: string }> {
    const loginFile = path.join(os.homedir(), "aiXcoder", "login");
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
    return res.level >= 2 || true;
}
