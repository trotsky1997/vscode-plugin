import * as fs from "fs-extra";
import { homedir } from "os";
import * as path from "path";
import * as request from "request";
import { getUUID } from "./API";
import { onDeactivateHandlers } from "./extension";
import log from "./logger";
import Preference from "./Preference";

const learnFilesFolder = path.join(homedir(), "aiXcoder", "learnFiles");
const lastUploadInfo = path.join(homedir(), "aiXcoder", "lastLearnFilesUpload");
try {
    fs.mkdirSync(learnFilesFolder);
} catch (e) { }
const learnFilesRegistry = path.join(homedir(), "aiXcoder", "learnFiles", "registry");

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
    private savedFiles = new Map<string, string>();
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

    public async sendf(endpoint, uuid, ext, filePath, data) {
        log(`${endpoint}file`);

        const body = await asyncRequestPost(`${endpoint}file`, {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            form: {
                uuid,
                ext,
                text: data,
                fileid: filePath,
                project: "autoTrain",
            },
        });
        log("upload file:", filePath, body);
    }

    public async sendFile(endpoint, uuid, ext, filePath, fileid) {
        try {
            const data = await fs.readFile(filePath, "utf-8");
            this.sendf(endpoint, uuid, ext, fileid, data);
        } catch (error) {
            // file not exists
        }
    }

    public async save() {
        if (this.cached.size !== 0) {
            try {
                await fs.stat(learnFilesFolder);
            } catch (e) {
                await fs.mkdir(learnFilesFolder);
            }
            for (const [ext, cached] of this.cached) {
                for (const file of cached) {
                    const cachedPath = this.normalizePathToFileName(file);
                    await fs.copyFile(file, path.join(learnFilesFolder, cachedPath));
                    this.savedFiles.set(cachedPath, ext);
                }
            }
            log("saved");
            this.cached.clear();
        }

        // openurl("aixcoder://upload");

        let lastUploadTime;
        try {
            const info = await fs.readFile(lastUploadInfo, "utf-8");
            lastUploadTime = parseInt(info, 10);
        } catch (e) {
            lastUploadTime = 0;
        }

        const {
            uuid,
        } = await getUUID();
        // only upload every two hour

        if (Date.now() - lastUploadTime > 1 * 60 * 60 * 1000) {
            if (this.savedFiles.size > 0) {
                for (const [cachedPath, ext] of this.savedFiles.entries()) {
                    this.sendFile(await Preference.getEndpoint(), uuid, ext, path.join(learnFilesFolder, cachedPath), cachedPath);
                }
                await fs.remove(learnFilesFolder);
                this.savedFiles.clear();
                await fs.writeFile(lastUploadInfo, Date.now().toString(), "utf8");
            }
        }
        this.saver = setTimeout(this.save.bind(this), 1000 * 10);
        // openurl("aixcoder://upload");
    }

    private normalizePathToFileName(p: string) {
        p = p.replace(/[^a-zA-Z0-9-._]+/g, "_");
        return p.substr(Math.max(p.length - 128, 0));
    }

}
