import * as fs from "fs";
import { EOL, homedir } from "os";
import * as path from "path";
import { openurl } from "./API";
import { onDeactivateHandlers } from "./extension";
import * as vscode from "vscode";
import { getUUID, isProfessional, myRequest } from "./API";
import * as targz from "targz";
import * as request from "request";

const fsp = fs.promises;

const learnFilesFolder = path.join(homedir(), "aiXcoder", "learnFiles");
const lastUploadInfo = path.join(homedir(), "aiXcoder", "lastLearnFilesUpload");
const endpoint = vscode.workspace.getConfiguration().get("aiXcoder.endpoint");
try {
    fs.mkdirSync(learnFilesFolder);
} catch (e) { }
const learnFilesRegistry = path.join(homedir(), "aiXcoder", "learnFiles", "registry");

async function readRegistry() {
    const savedFiles = new Map<string, Map<string, string>>();
    try {
        const content = await fsp.readFile(learnFilesRegistry, "utf-8");
        const registry = content.split(/\r?\n/);
        for (const line of registry) {
            if (line.length > 0) {
                const [ext, file, cachedPath] = line.split("\t");
                if (!savedFiles.has(ext)) {
                    savedFiles.set(ext, new Map());
                }
                savedFiles.get(ext).set(file, cachedPath);
            }
        }
    } catch (e) {
        // registry not exist
    }
    return savedFiles;
}

export async function asyncRequestPost(url: string, options?: request.CoreOptions, reqCb?: (req: request.Request) => void): Promise<string> {
    if (typeof options === "function") {
        options = {};
        reqCb = options as any;
    }
    options = options || {};
    options.method = "post";
    return new Promise((resolve, reject) => {
        const req = request(url, options, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                resolve(body);
            }
        });
        if (reqCb) {
            reqCb(req);
        }
    });
}
export default class Learner {
    public saver: NodeJS.Timeout;
    private cached = new Map<string, Set<string>>();
    public constructor() {
        onDeactivateHandlers.push(this.destroy.bind(this));
        this.saver = setTimeout(this.save.bind(this), 1000 * 10);
    }
    /**
     * learn
     */
    public learn(ext: string, file: string) {
        if (!this.cached.has(ext)) {
            this.cached.set(ext, new Set());
        }
        this.cached.get(ext).add(file);
    }

    public destroy() {
        clearInterval(this.saver);
        this.save();
    }

    public async save() {
        if (this.cached.size !== 0) {
            const savedFiles = await readRegistry();
            try {
                await fsp.stat(learnFilesFolder);
            } catch (e) {
                await fsp.mkdir(learnFilesFolder);
            }
            for (const [ext, cached] of this.cached) {
                for (const file of cached) {
                    const cachedPath = this.normalizePathToFileName(file);
                    await fsp.copyFile(file, path.join(learnFilesFolder, cachedPath));
                    if (!savedFiles.has(ext)) {
                        savedFiles.set(ext, new Map());
                    }
                    if (!savedFiles.get(ext).has(file)) {
                        savedFiles.get(ext).set(file, cachedPath);
                    }
                }
            }
            const newRegistryContent = [];
            for (const [ext, cached] of savedFiles) {
                for (const [file, cachedPath] of cached) {
                    newRegistryContent.push([ext, file, cachedPath].join("\t"));
                }
            }
            await fsp.writeFile(learnFilesRegistry, newRegistryContent.join(EOL), "utf-8");
            this.cached.clear();
            console.log("saved");
        }
        
        // openurl("aixcoder://upload");

        let lastUploadTime;
        try {
            const info = await fsp.readFile(lastUploadInfo, "utf-8");
            lastUploadTime = parseInt(info, 10);
        } catch (e) {
            lastUploadTime = 0;
        }
        
        const {
            token,
            uuid,
        } = await getUUID();
        // only upload every two hour
        
        if (Date.now() - lastUploadTime > 1 * 60  * 1000 ) {//* 60
            let have_file = false;
            const savedFiles = await readRegistry();
            for (const [ext, cached] of savedFiles) {
                for (const [file, cachedPath] of cached) {
                    try {
                        // await fs.copyFile(file, path.join(learnFilesFolder, cachedPath));
                        have_file = true;
                    } catch (e) {
                        // ignore
                        console.log(e.stack || e.message || e);
                    }
                }
            }
            
            if(have_file){
                // zip
                const dest = path.join(homedir(), "aiXcoder", "learnFiles.tar.gz");
                await new Promise((resolve, reject) => {
                    targz.compress({
                        src: learnFilesFolder,
                        dest,
                    }, (e => {
                        if (e) {
                            reject(e);
                        } else {
                            resolve();
                        }
                    }));
                });
                
                const body = await asyncRequestPost(`${endpoint}selflearnupload?uuid=${uuid}`, {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }, (req) => {
                    const form = req.form();
                    form.append("file", fs.createReadStream(dest));
                });

                console.log("selflearnupload",body);
                await fsp.unlink(dest);
                const deleteFolderRecursive = async function(rmpath) {
                    try {
                        (await fsp.readdir(rmpath)).forEach(async (file, index) => {
                        const curPath = path.join(rmpath, file);
                        if ((await fsp.lstat(curPath)).isDirectory()) { // recurse
                          deleteFolderRecursive(curPath);
                        } else { // delete file
                            await fsp.unlink(curPath);
                        }
                      });
                      await fsp.rmdir(rmpath);
                    } catch (e) {
                        console.log(e);
                    }
                  };
                await deleteFolderRecursive(learnFilesFolder);
                await fsp.writeFile(lastUploadInfo, Date.now().toString(), "utf8");
            }
        }
        this.saver = setTimeout(this.save.bind(this), 1000 * 10);

    }

    private normalizePathToFileName(p: string) {
        p = p.replace(/[^a-zA-Z0-9-._]+/g, "_");
        return p.substr(Math.max(p.length - 128, 0));
    }

    
}
