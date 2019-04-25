import * as uuidv4 from "uuid/v4";
import * as vscode from "vscode";

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
}
