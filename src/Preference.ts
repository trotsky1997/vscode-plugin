import * as os from "os";
import * as path from "path";
import * as uuidv4 from "uuid/v4";
import * as vscode from "vscode";
import { showInformationMessageOnce } from "./extension";
import FileAutoSyncer from "./FileAutoSyncer";
import { localize } from "./i18n";
import { getLocalPortSync, installerExists, switchToLocal } from "./localService";

function getParamsFromUrl(url: string) {
    url = decodeURI(url);
    const eachParamsArr = url.split("&");
    const obj: { [key: string]: string } = {};
    if (eachParamsArr && eachParamsArr.length) {
        eachParamsArr.map((param) => {
            const keyValuePair = param.split("=");
            const key = keyValuePair[0];
            const value = keyValuePair[1];
            obj[key] = value;
        });
    }
    return obj;
}

const homedir = os.homedir();

const loginFile = new FileAutoSyncer<{ uuid?: string, token?: string }>(path.join(homedir, "aiXcoder", "login"), (err, text) => {
    if (err) {
        return {};
    }
    return JSON.parse(text);
});

export const localserver = path.join(homedir, "aiXcoder", "localserver.json");
const models = new FileAutoSyncer<{ [model: string]: { active: boolean, url: string }; }>(localserver, (err, text) => {
    if (err) {
        return {};
    }
    const d = JSON.parse(text);
    const m = {};
    if (d.models) {
        for (const model of d.models) {
            m[model.name] = model;
        }
    }
    return m;
});

export default class Preference {
    public static uuid: string;
    public static context: vscode.ExtensionContext;
    public static isProfessional: boolean | void;
    public static async init(context: vscode.ExtensionContext) {
        Preference.context = context;
        // try {
        //     Preference.uuid = (await getUUID()).uuid;
        // } catch (e) {
        //     // try reading uuid every 10 min
        //     const repeater = setInterval(async () => {
        //         Preference.uuid = (await getUUID()).uuid;
        //         clearInterval(repeater);
        //     }, 1000 * 60 * 10);
        //     // meanwhile use a generated fake uuid
        //     Preference.uuid = context.globalState.get("aiXcoder.uuid");
        // }
        // try {
        //     Preference.isProfessional = await isProfessional();
        // } catch (e) {
        //     // not registered
        //     log(e);
        // }
        const loginInfo = await loginFile.get();
        if (loginInfo.uuid == null) {
            Preference.uuid = "vscode-" + uuidv4();
            context.globalState.update("aiXcoder.uuid", Preference.uuid);
        } else {
            Preference.uuid = loginInfo.uuid;
        }
    }

    public static async hasLoginFile() {
        const loginInfo = await loginFile.get();
        return loginInfo != null && loginInfo.uuid != null && !loginInfo.uuid.startsWith("local");
    }

    public static async getLocalModelConfig() {
        return models.get();
    }

    public static reloadLocalModelConfig() {
        return models.reload();
    }

    public static getParams(): any {
        const paramsString = vscode.workspace.getConfiguration().get("aiXcoder.additionalParameters") as string;
        const params = getParamsFromUrl(paramsString);
        return params;
    }

    public static getRequestParams() {
        const params = Preference.getParams() as any;
        if (params.controllerMode) {
            delete params.controllerMode;
            params.prob_th_rnn = 0;
            params.prob_th_rnn_t = 0;
        }
        if (vscode.workspace.getConfiguration().get("aiXcoder.sortOnly") as boolean) {
            params.ngen = 1;
        }
        return params;
    }

    public static getParam(key: string) {
        return Preference.getParams()[key];
    }

    public static shouldTrigger(lastModifedTime: { [uri: string]: number }, document: vscode.TextDocument) {
        // if (!vscode.workspace.getConfiguration().get("aiXcoder.alwaysTrigger")) {
        //     const last = lastModifedTime[document.uri.toJSON()] || 0;
        //     if (Date.now() - last < 100) {
        //         // triggered by key type
        //         return false;
        //     }
        // }
        return true;
    }

    public static getLongResultRankSortText() {
        const rank = vscode.workspace.getConfiguration().get("aiXcoder.longResultRank") as number;
        return ".0." + ((rank || 1) - 1) + ".0";
    }

    public static getLongResultCuts() {
        const cuts = vscode.workspace.getConfiguration().get("aiXcoder.longResultCuts") as string;
        switch (cuts) {
            case "Auto":
                return -1;
            case "0":
                return 0;
            case "1":
                return 1;
            case "2":
                return 2;
            case "3":
                return 3;
            case "4":
                return 4;
            case "5":
                return 5;
        }
        return -1;
    }

    public static getLongResultCutsLong2Short() {
        const order = vscode.workspace.getConfiguration().get("aiXcoder.longResultCutSort") as string;
        return order === "Long to Short";
    }

    public static getSelfLearn() {
        return vscode.workspace.getConfiguration().get("aiXcoder.selfLearning") as boolean;
    }

    public static getLocalEndpoint() {
        return `http://localhost:${getLocalPortSync()}/`;
    }

    public static getEndpointBasedOnModelConfig(
        mc: {
            [model: string]: {
                active: boolean;
                url: string;
            },
        },
        ext: string) {
        let localActive: undefined | boolean;
        if (mc.hasOwnProperty(ext)) {
            localActive = mc[ext].active;
        }
        if (!localActive) {
            return "https://api.aixcoder.com";
        } else {
            return Preference.getLocalEndpoint();
        }
    }

    public static async getEndpoint(ext: string) {
        let endpoint = "";
        if (await Preference.hasLoginFile()) {
            const mc = await Preference.getLocalModelConfig();
            if (Object.keys(mc).length === 0) {
                // prompt for switching to local
                showInformationMessageOnce("switchToLocal", "yes", "no", "showme").then((selection) => {
                    if (selection === "yes") {
                        switchToLocal(true);
                    } else if (selection === "no") {
                        switchToLocal(false);
                    } else if (selection === "showMe") {
                        vscode.commands.executeCommand("workbench.action.quickOpen", ">" + localize("switchCommandPrefix"));
                    }
                });
                endpoint = "https://api.aixcoder.com";
            } else {
                endpoint = Preference.getEndpointBasedOnModelConfig(mc, ext);
            }
        } else {
            if (await installerExists) {
                const mc = await Preference.getLocalModelConfig();
                if (Object.keys(mc).length === 0) {
                    // prompt for switching to local
                    showInformationMessageOnce("switchToOnline", "login", "continueToUseLocal").then((selection) => {
                        if (selection === "login") {
                            showInformationMessageOnce("promptToLogin");
                        } else if (selection === "continueToUseLocal") {
                            switchToLocal(true);
                        }
                    });
                    endpoint = Preference.getLocalEndpoint();
                } else {
                    endpoint = Preference.getEndpointBasedOnModelConfig(mc, ext);
                }
            } else {
                endpoint = Preference.getLocalEndpoint();
            }
        }
        if (!endpoint.endsWith("/")) {
            endpoint += "/";
        }
        return endpoint;
    }
}
