import log from "./logger";

const defaultWaitTime = 1000 * 10;

export default class NetworkController {
    // 0:正常状态 + 连续5个错误 = 1:错误状态
    // 0:正常状态 + 成功 = 错误数归零
    // 1:错误状态 + 等待(默认10s) = 2:尝试状态
    // 2:尝试状态 + 成功 = 0:正常状态 + 等待时间归位
    // 2:尝试状态 + 失败 = 1:错误状态 + 等待时间翻倍
    private status = 0;
    private waitTime = defaultWaitTime;
    private networkErrors = 0;
    private lastErrorEndTime = 0;
    public shouldPredict() {
        this.printStatus();
        return this.status !== 1;
    }

    public onSuccess() {
        if (this.status === 0) {
            // 0:正常状态 + 成功 = 错误数归零
            this.networkErrors = 0;
        } else if (this.status === 2) {
            // 2:尝试状态 + 成功 = 0:正常状态 + 等待时间归位
            this.status = 0;
            this.waitTime = defaultWaitTime;
        }
    }

    public onFailure() {
        if (this.status === 0) {
            // 0:正常状态 + 连续5个错误 = 1:错误状态
            this.networkErrors += 1;
            if (this.networkErrors >= 5) {
                this.status = 1;
                this.errorCountDown();
            }
        } else if (this.status === 2) {
            // 2:尝试状态 + 失败 = 1:错误状态 + 等待时间翻倍
            this.status = 1;
            this.waitTime *= 2;
            this.errorCountDown();
        }
    }

    private printStatus() {
        if (this.status === 0) {

        } else if (this.status === 1) {
            log("Status: Error, retry in " + (this.lastErrorEndTime - Date.now()) + "ms");
        } else if (this.status === 2) {
            log("Status: Retry");
        }
    }

    private errorCountDown() {
        // 1:错误状态 + 等待(默认10s) = 2:尝试状态
        this.lastErrorEndTime = Date.now() + this.waitTime;
        setTimeout(() => {
            this.status = 2;
        }, this.waitTime);
    }
}
