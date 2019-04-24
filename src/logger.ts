import * as vscode from "vscode";

class Logger {

    static get Instance() {
        Logger.singleton || (Logger.singleton = new Logger());
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
    public log(s: string | Error) {
        if (s instanceof Error) {
            s = this.formatErrorForLogging(s);
        }
        this.channel.appendLine(s);
    }

    public formatErrorForLogging(e) {
        let t = "";
        if ("string" === typeof e) { t = e; } else {
            e.message && (t = `Error Message: ${e.message}`), e.name && -1 === e.message.indexOf(e.name) && (t += `, (${e.name})`);
            const a = e.innerException;
            a && (a.message || a.name) && (a.message && (t += `, Inner Error Message: ${a.message}`), a.name && -1 === a.message.indexOf(a.name) && (t += `, (${a.name})`));
        }
        return t;
    }
}

const instance = new Logger();
const log = instance.log.bind(instance);

export default log;
