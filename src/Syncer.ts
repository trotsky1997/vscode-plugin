const NOTIFIED = "__" as any;

export class Syncer<T> {
    private last: T;
    private lastKey: number;
    private awaiters: {
        [key: number]: (T | ((v: T) => void));
    } = {};

    public notify(key: number) {
        const awaiter = this.awaiters[key];
        console.log("syncer notify: AiX: resolve " + key + " " + awaiter);
        if (awaiter === undefined || awaiter === NOTIFIED) {
            // LSE will go later
            console.log("syncer notify: LSE will go later");
            this.awaiters[key] = NOTIFIED;
            setTimeout(() => {
                if (awaiter === NOTIFIED) {
                    delete this.awaiters[key];
                }
            }, 10 * 1000);
        } else if (typeof awaiter === "function" && (awaiter as any).notify) {
            // LSE went earlier
            console.log("syncer notify: LSE went earlier");
            (awaiter as any)();
        }
    }

    /**
     * put
     */
    public put(key: number, value: T) {
        this.last = value;
        this.lastKey = key;
        const awaiter = this.awaiters[key];
        // console.log("syncer put: AiX: resolve " + key + " " + awaiter);
        if (awaiter === undefined || awaiter === NOTIFIED) {
            // LSE will go later
            // console.log("syncer put: LSE will go later");
            this.awaiters[key] = value;
            setTimeout(() => {
                if (awaiter === value) {
                    delete this.awaiters[key];
                }
            }, 10 * 1000);
        } else if (typeof awaiter === "function") {
            // LSE went earlier
            // console.log("syncer put: LSE went earlier");
            (awaiter as any)(value);
        }
    }
    /**
     * get
     */
    public async get(key: number, strict = false): Promise<T | undefined> {
        let value: T | undefined;
        const _t = Date.now();
        const awaiter = this.awaiters[key];
        if (awaiter === undefined || awaiter === NOTIFIED) {
            let resolved = false;
            console.log("syncer get: AIX will go later");
            // AIX will go later
            const ppp = new Promise<T | undefined>((resolve, reject) => {
                const newResolve = (_: T) => {
                    resolved = true;
                    console.log("syncer get: ppp will be resolved");
                    resolve(_);
                    if (this.awaiters[key] === newResolve) {
                        delete this.awaiters[key];
                    }
                };
                this.awaiters[key] = newResolve;
                setTimeout(() => {
                    if (this.awaiters[key] === newResolve) {
                        // console.log("syncer get: clear cache at " + key);
                        delete this.awaiters[key];
                    }
                }, 10 * 1000);
                const resultWaiter = setTimeout(() => {
                    if (!resolved) {
                        console.log("syncer get: timed out at " + key);
                        resolve();
                        delete this.awaiters[key];
                    }
                }, 500);
                if (awaiter !== NOTIFIED) {
                    newResolve.notify = true;
                    // wait for notify
                    console.log("syncer get: not notified " + key);
                    setTimeout(() => {
                        if (!resolved) {
                            console.log("syncer get: notify timed out at " + key);
                            clearTimeout(resultWaiter);
                            resolve((!strict || this.lastKey === key) ? this.last : null);
                            delete this.awaiters[key];
                        }
                    }, 100);
                }
            });
            value = await ppp;
            console.log("syncer get: ppp is resolved");
        } else if (typeof awaiter === "object") {
            console.log("syncer get: AIX went earlier");
            // AIX went earlier
            value = awaiter;
        }
        console.log(`syncer get took ${Date.now() - _t}ms`);
        return value;
    }
}
