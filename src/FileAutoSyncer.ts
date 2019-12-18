import * as fs from "fs-extra";

export default class FileAutoSyncer<T> {
    private file: string;
    private text: Promise<string>;
    private lastCheckLocalTime = 0;
    private lastResult: T = undefined;
    private lastText: string = null;
    private cb: (err: Error, text: string) => T | Promise<T>;

    constructor(file: string, cb?: (err: Error, text: string) => T | Promise<T>) {
        this.file = file;
        this.cb = cb || ((err, text) => {
            if (err) {
                throw err;
            }
            return text as any;
        });
        this.text = null;
        this.readFile();
        this.get();
        setInterval(this.readFile.bind(this), 1000 * 60 * 5);
        this.initWatch();
    }

    public reload() {
        this.readFile();
    }

    public async get(): Promise<T> {
        let err = null;
        let res = null;
        try {
            res = await this.text;
        } catch (error) {
            err = error;
        }
        return this.lastResult = await this.cb(err, res);
    }

    public getSync(): T {
        if (this.lastResult !== undefined) {
            return this.lastResult;
        }
        if (!this.lastText) {
            this.lastText = fs.readFileSync(this.file, "utf-8");
            this.text = Promise.resolve(this.lastText);
        }
        return this.cb(null, this.lastText) as T;
    }

    private async readFile() {
        if (Date.now() - this.lastCheckLocalTime < 1000 * 5) {
            return;
        }
        this.lastCheckLocalTime = Date.now();
        this.text = fs.readFile(this.file, "utf-8").then((t) => {
            this.lastText = t;
            return t;
        });
    }

    private async initWatch() {
        try {
            await fs.stat(this.file);
        } catch (e) {
            // await fs.writeFile(this.file, "{}", "utf-8");
        }
        fs.watch(this.file, (event, filename) => {
            this.readFile();
        });
    }
}
