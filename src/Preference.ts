import * as uuidv4 from "uuid/v4";
import * as vscode from "vscode";

function getParamsFromUrl(url: string) {
    url = decodeURI(url);
    const eachParamsArr = url.split("&");
    const obj = {};
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

export default class Preference {
    public static uuid: string;
    public static context: vscode.ExtensionContext;
    public static init(context: vscode.ExtensionContext) {
        Preference.context = context;
        Preference.uuid = context.globalState.get("aiXcoder.uuid");
        if (Preference.uuid == null || Preference.uuid === "") {
            Preference.uuid = "vscode-" + uuidv4();
            context.globalState.update("aiXcoder.uuid", Preference.uuid);
        }
    }

    public static getParams() {
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
        if (!vscode.workspace.getConfiguration().get("aiXcoder.alwaysTrigger")) {
            const last = lastModifedTime[document.uri.toJSON()] || 0;
            if (Date.now() - last < 100) {
                // triggered by key type
                return false;
            }
        }
        return true;
    }
}
