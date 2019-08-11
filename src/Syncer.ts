export class Syncer<T> {
    private awaiters: {
        [key: number]: (T | ((v: T) => void));
    } = {};
    /**
     * put
     */
    public put(key: number, value: T) {
        const awaiter = this.awaiters[key];
        // console.log("AiX: resolve " + key + " " + awaiter);
        if (awaiter == null) {
            // LSE will go later
            // console.log("LSE will go later");
            this.awaiters[key] = value;
            setTimeout(() => {
                if (awaiter === value) {
                    delete this.awaiters[key];
                }
            }, 10 * 1000);
        } else if (typeof awaiter === "function") {
            // LSE went earlier
            // console.log("LSE went earlier");
            (awaiter as any)(value);
        }
    }
    /**
     * get
     */
    public async get(key: number) {
        let value: T;
        const _t = Date.now();
        const awaiter = this.awaiters[key];
        if (awaiter == null) {
            let resolved = false;
            // console.log("AIX will go later");
            // AIX will go later
            const ppp = new Promise<T>((resolve, reject) => {
                const newResolve = (_: T) => {
                    resolved = true;
                    // console.log("ppp will be resolved with " + JSON.stringify(_));
                    resolve(_);
                    if (this.awaiters[key] === newResolve) {
                        delete this.awaiters[key];
                    }
                };
                this.awaiters[key] = newResolve;
                setTimeout(() => {
                    if (this.awaiters[key] === newResolve) {
                        // console.log("clear cache at " + key);
                        delete this.awaiters[key];
                    }
                }, 10 * 1000);
                setTimeout(() => {
                    if (!resolved) {
                        // console.log("timed out at " + key);
                        resolve();
                        delete this.awaiters[key];
                    }
                }, 500);
            });
            value = await ppp;
            // console.log("ppp is resolved with " + JSON.stringify(value));
        } else if (typeof awaiter === "object") {
            // console.log("AIX went earlier");
            // AIX went earlier
            value = awaiter;
        }
        console.log(`syncer get took ${Date.now() - _t}ms`);
        return value;
    }
}
