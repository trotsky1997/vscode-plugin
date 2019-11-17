import { exec } from "child_process";
import * as download from "download";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as vscode from "vscode";
import { showInformationMessageOnce } from "./extension";
import { localize } from "./i18n";
import log from "./logger";
import Preference from "./Preference";

let homedir = os.homedir();
if (process.platform === "win32") {

} else if (process.platform === "darwin") {
    homedir = path.join(homedir, "Library", "Application Support");
} else {
}

function getAixcoderInstallUserPath() {
    const installInfoPath = path.join(homedir, "aiXcoder", "installer");
    return installInfoPath;
}

async function getActivePid(pid: string) {
    // ps -ax | awk '$1 == 65101'
    if (!pid) {
        return null;
    }
    let cmd = "";
    let result: string;
    try {
        switch (process.platform) {
            case "win32":
                cmd = `wmic process where processid=${pid} get executablepath, name, processid | findstr ${pid}`;
                result = await execAsync(cmd);
                // eg.: C:\Program Files\PyCharm\bin\pycharm64.exe  pycharm64.exe 1234
                if (result) {
                    const resultLines = (result).split("\n");
                    for (const tmpLine of resultLines) {
                        if (tmpLine.indexOf(pid) >= 0) {
                            const resultSplits = tmpLine.trim().split(/\s+/);
                            if (resultSplits.length >= 2) {
                                return resultSplits[resultSplits.length - 1].trim();
                            }
                        }
                    }
                }
                break;
            case "darwin":
                cmd = `ps -ax | awk '$1 == ${pid}'`;
                result = await execAsync(cmd);
                // 65101 ??         0:00.57 ./node ./entry.js
                if (result) {
                    const resultSplits = result.trim().split(/\s+/, 2);
                    if (resultSplits.length > 0) {
                        return resultSplits[0].trim();
                    }
                }
                break;
            default:
                return null;
        }
    } catch (e) {
        // no result comes to catch
        // console.log(e);
    }
    return null;
}

async function getLocalServerPid() {
    const lockfile = path.join(homedir, "aiXcoder", ".router.lock");
    try {
        await fs.stat(lockfile);
        const startPid = (await fs.readFile(lockfile, { encoding: "utf-8" })).trim();
        return getActivePid(startPid);
    } catch (e) {
        console.error(e);
    }
    return null;
}

async function softStartLocalService() {
    const pidStr = await getLocalServerPid();
    if (!pidStr) {
        launchLocalServer();
    }
}

function getExePath() {
    const localserver = path.join(getAixcoderInstallUserPath(), "localserver", "current");
    if (process.platform === "win32") {
        return path.join(localserver, "server", "aixcoder.bat");
    } else {
        return path.join(localserver, "server", "aixcoder.sh");
    }
}

function launchLocalServer() {
    const exePath = getExePath();
    let cmd = `"${exePath}"`;
    if (Preference.getParams().localconsole) {
        if (process.platform === "win32") {
            cmd = `cmd /C start "${exePath}"`;
        } else if (process.platform === "darwin") {
            cmd = `open -a Terminal "${exePath}"`;
        } else {
            cmd = `gnome-terminal -- "${exePath}"`;
        }
    }
    execAsync(cmd).catch((e) => {
        lastOpenFailed = true;
        // showInformationMessageOnce("openAixcoderUrlFailed");
        log(e);
    });
}

export async function execAsync(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(cmd, (err, stdout, stderr) => {
            if (err) {
                reject(err);
            } else {
                resolve(stdout);
            }
        });
    });
}

let lastOpenFailed = false;
export async function openurl(url: string) {
    if (lastOpenFailed) { return; }
    if (url !== "aixcoder://localserver") {
        return;
    }
    const aixcoderPath = path.join(getAixcoderInstallUserPath(), "localserver", "current", "server");
    try {
        await fs.mkdirp(aixcoderPath);
    } catch (e) {
        //
    }
    try {
        await fs.stat(getExePath());
    } catch (e) {
        lastOpenFailed = true;
        // server not found
    }
    launchLocalServer();
}

export async function getVersion() {
    const aixcoderPath = path.join(getAixcoderInstallUserPath(), "localserver", "current", "server", ".version");
    let version: string;
    try {
        version = await fs.readFile(aixcoderPath, "utf-8");
    } catch (e) {
        version = "0.0.0";
    }
    return version;
}

interface FileProgressLite {
    percent: number;
    transferred: number;
    total: number;
}

export async function forceUpdate() {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize("aixUpdateProgress"),
        cancellable: true,
    }, async (progress, token) => {
        const aixcoderPath = path.join(getAixcoderInstallUserPath(), "localserver", "current", "server");
        try {
            await fs.mkdirp(aixcoderPath);
        } catch (e) {
            //
        }
        let ball: string;
        let stream;
        if (process.platform === "win32") {
            ball = "server-win.zip";
            stream = download(`https://github.com/aixcoder-plugin/localservice/releases/latest/download/${ball}`, aixcoderPath, {
                extract: true,
            });
        } else if (process.platform === "darwin") {
            ball = "server-osx.zip";
            stream = download(`https://github.com/aixcoder-plugin/localservice/releases/latest/download/${ball}`, aixcoderPath, {
                extract: true,
            });
        } else {
            ball = "server-linux.tar.gz";
            stream = download(`https://github.com/aixcoder-plugin/localservice/releases/latest/download/${ball}`, aixcoderPath);
        }
        const onErr = (err?: any) => {
            vscode.window.showInformationMessage(localize("aixUpdatefailed", "https://github.com/aixcoder-plugin/localservice/releases", aixcoderPath));
        };
        token.onCancellationRequested((e) => {
            stream.end();
            if (myReq) {
                myReq.abort();
            }
            onErr();
        });
        let last = 0;
        let myReq = null;
        stream.on("request", (req: any) => {
            myReq = req;
        });
        stream.on("downloadProgress", (p: FileProgressLite) => {
            progress.report({
                message: `${p.transferred}/${p.total} - ${p.percent.toLocaleString(undefined, { style: "percent", minimumFractionDigits: 2 })}`,
                increment: (p.percent - last) * 100,
            });
            last = p.percent;
        });
        stream.catch(onErr);
        await stream;
        if (ball.endsWith(".tar.gz")) {
            try {
                await execAsync(`tar zxf "${path.join(aixcoderPath, ball)}" -C "${aixcoderPath}"`);
            } catch (e) {
                onErr();
            }
        }
        lastOpenFailed = false;
    }).then(null, (err) => {
        log(err);
    });
}
