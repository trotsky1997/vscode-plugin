import * as fs from "fs";
import { EOL, homedir } from "os";
import * as path from "path";
// import { openurl } from "./API";
import { onDeactivateHandlers } from "./extension";

const learnFilesFolder = path.join(homedir(), "aiXcoder", "learnFiles");
try {
    fs.mkdirSync(learnFilesFolder);
} catch (e) { }
const learnFilesRegistry = path.join(homedir(), "aiXcoder", "learnFiles", "registry");

async function readRegistry() {
    const savedFiles = new Map<string, Map<string, string>>();
    try {
        const content = await fs.promises.readFile(learnFilesRegistry, "utf-8");
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
            for (const [ext, cached] of this.cached) {
                for (const file of cached) {
                    const cachedPath = this.normalizePathToFileName(file);
                    // await fs.promises.copyFile(file, path.join(learnFilesFolder, cachedPath));
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
            await fs.promises.writeFile(learnFilesRegistry, newRegistryContent.join(EOL), "utf-8");
            this.cached.clear();
            console.log("saved");
        }
        this.saver = setTimeout(this.save.bind(this), 1000 * 10);
        // openurl("aixcoder://upload");
    }

    private normalizePathToFileName(p: string) {
        p = p.replace(/[^a-zA-Z0-9-._]+/g, "_");
        return p.substr(Math.max(p.length - 128, 0));
    }
}
