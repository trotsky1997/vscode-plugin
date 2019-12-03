import { exec } from "child_process";
import * as decompress from "decompress";
import * as download from "download";
import * as filesize from "filesize";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as request from "request-promise";
import * as vscode from "vscode";
import { showInformationMessage } from "./extension";
import { getLocale, localize } from "./i18n";
import log from "./logger";
import Preference from "./Preference";
import * as AixUpdater from "./utils/AixUpdaterClient";

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
            cmd = `cmd /c start "" "${exePath}"`;
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

let serverStarting = false;
export function isServerStarting() {
    return serverStarting;
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
    serverStarting = true;
    authorize(); // chmod 777 for mac
    launchLocalServer();
    vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localize("localServiceStarting"),
        cancellable: true,
    }, (progress, token) => new Promise((resolve, reject) => {
        let tries = 0;
        const timeout = 60 * 1000;
        const startTime = Date.now();
        (function testServerStarted() {
            if (token.isCancellationRequested || Date.now() - startTime > timeout) {
                reject(new Error("local service failed to start"));
                return;
            }
            tries++;
            log("Try " + tries);
            download(Preference.getEndpoint(), null, {
                timeout: 1000,
            }).then((value) => {
                lastOpenFailed = false;
                serverStarting = false;
                resolve();
            }).catch((e) => {
                setTimeout(testServerStarted, 3000);
            });
        })();
    }));
}

export async function getVersion() {
    const aixcoderPath = path.join(getAixcoderInstallUserPath(), "localserver", "current", "server", ".version");
    let version = "0.0.0";
    try {
        version = await fs.readFile(aixcoderPath, "utf-8");
    } catch (e) {
    }
    return version;
}

interface FileProgressLite {
    percent: number;
    transferred: number;
    total: number;
}

async function kill() {
    const lockfile = path.join(homedir, "aiXcoder", ".router.lock");
    try {
        const prevPid = await fs.promises.readFile(lockfile, "utf-8");
        if (os.platform() === "win32") {
            await execAsync("taskkill /F /PID " + prevPid);
        } else if (os.platform() === "darwin") {
            await execAsync("kill " + prevPid);
        } else {
            await execAsync("kill " + prevPid);
        }
    } catch (e) {
        // file not present
        console.error(e);
    }
}

async function authorize() {
    if (os.platform() !== "win32") {
        await execAsync(`chmod -R 777 ${getAixcoderInstallUserPath()}`);
    }
}

class AiXCancellationToken {
    private reason: any;
    public get canceled(): boolean {
        return this._canceled;
    }
    public set canceled(v: boolean) {
        if (v && !this._canceled) {
            this._canceled = v;
            this.listeners.forEach((element) => element(this.reason));
        } else {
            this._canceled = v;
        }
    }
    // tslint:disable-next-line: variable-name
    private _canceled: boolean;
    private listeners: Array<(reason?: any) => void> = [];
    public cancel(reason?: any) {
        this.reason = reason;
        this.canceled = true;
    }

    public onCancellationRequested(listener: (reason?: any) => void) {
        this.listeners.push(listener);
    }
}

async function downloadEx(url: string, targetPath: string, onProgress: (p: FileProgressLite) => void, onSpeed: (speed: number) => void, onErr: (err?: any) => void, token: AiXCancellationToken) {
    let speedTestStart = 0;
    let totalP = {
        transferred: 0,
        total: 1,
    };
    const speedTester = onSpeed && setInterval(() => {
        const elapsed = Date.now() - speedTestStart;
        if (speedTestStart > 0 && elapsed > 3000) {
            const speed = totalP.transferred / (elapsed / 1000); // byte / sec
            onSpeed(speed);
        }
    }, 100);

    const stream = download(url, targetPath);
    let myReq = null;
    stream.on("request", (req: any) => {
        myReq = req;
    });
    token.onCancellationRequested((reason) => {
        stream.end();
        if (myReq) {
            myReq.abort();
        }
        onErr(reason);
    });
    stream.on("downloadProgress", (p) => {
        totalP = p;
        if (speedTestStart === 0) {
            speedTestStart = Date.now();
        }
        onProgress(p);
    });
    return stream.then((value) => {
        clearInterval(speedTester);
        return value;
    }, (reason) => {
        clearInterval(speedTester);
        onErr(reason);
    });
}

export async function forceUpdate(localVersion: string, remoteVersion: string) {
    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: localVersion === "0.0.0" ? localize("aixInstallProgress") : localize("aixUpdateProgress"),
        cancellable: true,
    }, async (progress, token) => {
        const aixcoderPath = path.join(getAixcoderInstallUserPath(), "localserver", "current", "server");
        try {
            await fs.mkdirp(aixcoderPath);
        } catch (e) {
            //
        }

        let lastReportTime = 0;
        let last = 0;
        const onProgress = (p: FileProgressLite) => {
            if (Date.now() - lastReportTime > 100) {
                progress.report({
                    message: `${filesize(p.transferred)}/${filesize(p.total)} - ${p.percent.toLocaleString(undefined, { style: "percent", minimumFractionDigits: 2 })}`,
                    increment: (p.percent - last) * 100,
                });
                last = p.percent;
                lastReportTime = Date.now();
            }
        };

        const cancellationToken = new AixUpdater.AiXCancellationToken();
        token.onCancellationRequested(() => {
            cancellationToken.cancel("userCancel");
        });
        let ball: string;
        let patchball: string;
        const rawRemoteVersion = remoteVersion.startsWith("v") ? remoteVersion.substr(1) : remoteVersion;
        if (process.platform === "win32") {
            ball = "server-win.zip";
            patchball = `win-patch_${localVersion}_${rawRemoteVersion}_full.zip`;
        } else if (process.platform === "darwin") {
            ball = "server-osx.zip";
            patchball = `osx-patch_${localVersion}_${rawRemoteVersion}_full.zip`;
        } else {
            ball = "server-linux.tar.gz";
            patchball = `linux-patch_${localVersion}_${rawRemoteVersion}_full.tar.gz`;
        }
        try {
            await AixUpdater.simplePatch(aixcoderPath, [
                `https://github.com/aixcoder-plugin/localservice/releases/latest/download/${patchball}`,
                `http://image.aixcoder.com/localservice/releases/download/${remoteVersion}/${patchball}`,
            ], [
                `https://github.com/aixcoder-plugin/localservice/releases/latest/download/${ball}`,
                `http://image.aixcoder.com/localservice/releases/download/${remoteVersion}/${ball}`,
            ], (p) => {
                if (p.downloadProgress) {
                    onProgress(p.downloadProgress.downloadProgresses[0]);
                } else {
                    progress.report({
                        message: p.toString(getLocale()),
                    });
                }
            }, kill, cancellationToken);
            showInformationMessage(localize("aixUpdated", remoteVersion, localVersion));
        } catch (err) {
            if (err) {
                log(err);
            }
            const downloadPage = "https://github.com/aixcoder-plugin/localservice/releases";
            vscode.window.showInformationMessage(localize("aixUpdatefailed", downloadPage, aixcoderPath), localize("openInBrowser")).then((select) => {
                if (select === localize("openInBrowser")) {
                    vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(downloadPage));
                }
            });
        }
        lastOpenFailed = false;
    }).then(null, (err) => {
        log(err);
    });
}

export async function getServiceStatus(ext: string) {
    const resp = await request({
        method: "GET",
        url: Preference.getEndpoint() + "getSaStatus?ext=" + ext,
        timeout: 1000,
    });
    const { status } = JSON.parse(resp);
    return status as number;
}
