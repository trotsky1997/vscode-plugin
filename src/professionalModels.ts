import * as vscode from "vscode";
import { myRequest } from "./API";
import { ModelInfo, showMessage } from "./extension";
import Preference from "./Preference";

export async function promptProfessional(professionalModel: ModelInfo, ext: string) {
    const endpoint = await Preference.getEndpoint(ext);

    let resp: any = await myRequest({
        method: "get",
        url: "/api/v1/getLoginStatus",
    }, endpoint);
    let loggedIn = false;
    if (resp) {
        resp = JSON.parse(resp);
        if (resp.info && resp.info.uuid && !resp.info.uuid.startsWith("local-")) {
            loggedIn = true;
        }
    }
    if (loggedIn) {
        const r = await showMessage("professionalModelAvailable", {
            type: "info",
            items: ["tryit", "learnmore"],
            once: true,
            nevershowagain: true,
        });
        if (r === "tryit") {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(endpoint));
        } else if (r === "learnmore") {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.parse("https://www.aixcoder.com"));
        }
    } else {
        const r = await showMessage("loginRequiredForProfessionalModels", {
            type: "info",
            items: ["login"],
            once: true,
            nevershowagain: true,
        });
        if (r === "login") {
            vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(endpoint));
        }
    }
}
