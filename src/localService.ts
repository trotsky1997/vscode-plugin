import { exec } from "child_process";
import * as download from "download";
import * as filesize from "filesize";
import * as fs from "fs-extra";
import * as os from "os";
import * as path from "path";
import * as request from "request-promise";
import * as vscode from "vscode";
import * as API from "./API";
import { showInformationMessage } from "./extension";
import FileAutoSyncer from "./FileAutoSyncer";
import { getLocale, localize } from "./i18n";
import log from "./logger";
import Preference, { localserver } from "./Preference";
import * as AixUpdater from "./utils/AixUpdaterClient";

let homedir = os.homedir();
if (process.platform === "win32") {

} else if (process.platform === "darwin") {
    homedir = path.join(homedir, "Library", "Application Support");
} else {
}

export function getAixcoderHomePath() {
    return path.join(homedir, "aiXcoder");
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
    const localserverFolder = path.join(getAixcoderInstallUserPath(), "localserver", "current");
    if (process.platform === "win32") {
        return path.join(localserverFolder, "server", "aixcoder.bat");
    } else {
        return path.join(localserverFolder, "server", "aixcoder.sh");
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

async function _installerExists() {
    if (process.platform === "win32") {
        return fs.pathExists(path.join(process.env.LOCALAPPDATA, "aixcoderinstaller"));
    } else if (process.platform === "darwin") {
        return fs.pathExists("/Applications/aixcoder.app");
    } else {
        return false;
    }
}

export const installerExists = _installerExists();

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
export async function startLocalService(soft: boolean) {
    if (lastOpenFailed) { return; }
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

    if (soft) {
        try {
            await download(Preference.getLocalEndpoint(), null, {
                timeout: 1000,
            });
            lastOpenFailed = false;
            serverStarting = false;
            return;
        } catch (error) {
            // server not running
        }
    }

    serverStarting = true;
    await authorize(); // chmod 777 for mac
    launchLocalServer();
    await vscode.window.withProgress({
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
            download(Preference.getLocalEndpoint(), null, {
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
    let aixcoderPath = path.join(getAixcoderInstallUserPath(), "localserver", "current", "server", ".version");
    let version = "0.0.0";
    try {
        version = await fs.readFile(aixcoderPath, "utf-8");
    } catch (e) {
        try {
            aixcoderPath = path.join(getAixcoderInstallUserPath(), "localserver", "current", "server", "version");
            version = await fs.readFile(aixcoderPath, "utf-8");
        } catch (e) {
            // pass
        }
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
        await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
        // file not present
        console.error(e);
    }
}

async function authorize() {
    if (os.platform() !== "win32") {
        await execAsync(`chmod -R 777 "${getAixcoderInstallUserPath()}"`);
    }
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
                `http://image.aixcoder.com/localservice/releases/download/${remoteVersion}/${patchball}`,
                `https://github.com/aixcoder-plugin/localservice/releases/latest/download/${patchball}`,
            ], [
                `http://image.aixcoder.com/localservice/releases/download/${remoteVersion}/${ball}`,
                `https://github.com/aixcoder-plugin/localservice/releases/latest/download/${ball}`,
            ], (p) => {
                if (p.downloadProgress) {
                    onProgress(p.downloadProgress.downloadProgresses[0]);
                } else {
                    progress.report({
                        message: p.toString(getLocale()),
                    });
                }
            }, async (msg) => {
                if (msg === "decompress") {
                    progress.report({ message: localize("unzipping") });
                } else if (msg === "patch") {
                    progress.report({ message: localize("updating") });
                    await kill();
                }
            }, cancellationToken);
            if (localVersion === "0.0.0") {
                showInformationMessage(localize("aixInstalled", remoteVersion));
            } else {
                showInformationMessage(localize("aixUpdated", remoteVersion, localVersion));
            }
        } catch (err) {
            if (err) {
                log(err);
            }
            const downloadPage = "https://github.com/aixcoder-plugin/localservice/releases";
            log(localize("aixUpdatefailed", downloadPage, aixcoderPath));
            // vscode.window.showInformationMessage(localize("aixUpdatefailed", downloadPage, aixcoderPath), localize("openInBrowser")).then((select) => {
            //     if (select === localize("openInBrowser")) {
            //         vscode.commands.executeCommand("vscode.open", vscode.Uri.parse(downloadPage));
            //     }
            // });
        }
        lastOpenFailed = false;
    }).then(null, (err) => {
        log(err);
    });
}

export async function getServiceStatus(ext: string) {
    const resp = await request({
        method: "GET",
        url: (await Preference.getEndpoint(ext)) + "getSaStatus?ext=" + ext,
        timeout: 1000,
    });
    const { status } = JSON.parse(resp);
    return status as number;
}

function getConfigPath() {
    return path.join(homedir, "aiXcoder", "localconfig.json");
}

const localConfig = new FileAutoSyncer(getConfigPath(), (err, text) => {
    if (err) {
        return {};
    }
    return JSON.parse(text);
});

export function getLocalPortSync() {
    return localConfig.getSync().port || "8787";
}

export async function getLocalPort() {
    return (await localConfig.get()).port || "8787";
}

export async function switchToLocal(local: boolean) {
    await fs.writeFile(localserver, JSON.stringify({
        models: [{
            name: "java(Java)",
            active: local,
        }, {
            name: "python(Python)",
            active: local,
        }, {
            name: "typescript(Typescript)",
            active: local,
        }, {
            name: "javascript(Javascript)",
            active: local,
        }, {
            name: "cpp(Cpp)",
            active: local,
        }, {
            name: "go(Go)",
            active: local,
        }, {
            name: "php(Php)",
            active: local,
        }],
    }, null, 2), "utf-8");
    Preference.reloadLocalModelConfig();
    API.checkLocalServiceUpdate();
}
