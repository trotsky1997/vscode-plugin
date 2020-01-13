import * as vscode from "vscode";
import * as API from "./API";

class Logger {

    static get Instance() {
        if (!Logger.singleton) {
            Logger.singleton = new Logger();
        }
        return Logger.singleton;
    }
    public static singleton: Logger;
    public channel: vscode.OutputChannel;

    constructor() {
        this.channel = vscode.window.createOutputChannel("AiXCoder");
    }
    /**
     * log
     */
    public log(s: string | Error, sendTelemetry = true) {
        if (s instanceof Error) {
            s = this.formatErrorForLogging(s);
            if (sendTelemetry) {
                API.sendErrorTelemetry(s);
            }
        }
        console.log(s);
        this.channel.appendLine(s);
    }

    public formatErrorForLogging(e) {
        let t = "";
        if ("string" === typeof e) { t = e; } else {
            if (e.message) {
                t = `Error Message: ${e.message} + stack: ${e.stack}`;
            }
            if (e.name && -1 === e.message.indexOf(e.name)) {
                t += `, (${e.name})`;
            }
            const a = e.innerException;
            if (a) {
                if (a.message) {
                    t += `, Inner Error Message: ${a.message} + stack: ${a.stack}`;
                }
                if (a.name && -1 === a.message.indexOf(a.name)) {
                    t += `, (${a.name})`;
                }
            }
        }
        return t;
    }
}

const instance = new Logger();
const log = instance.log.bind(instance);

export default log;
