import * as https from "https";

function sendReqAAA() {
    const body = "text=import+os%0D%0Aimport+tensorflow+as+tf%0D%0A%0D%0Alinear_model+%3D+%5B%5D%3B%0D%0Ay+%3D+%5B%5D%3B%0D%0A%0D%0Asess+%3D+tf.InteractiveSession%28%29%0D%0Aloss+%3D+tf.reduce_sum%28tf.square%28linear_model+-+y%29%29%0D%0Ar&ext=python%28Python%29&uuid=vscode-51e280ed-6f00-409d-bfcb-651f1dc21791&fileid=d%3A%5Ctemp%5Cs%5Ctest.py&project=s&remaining_text=&queryUUID=9621&offset=0&md5=f7af3863a505b2fdda2612ac91808a9f&sort=1";
    const buf = Buffer.from(body, "utf-8");
    // https://www.google.com/search?q=nodejs&sugexp=chrome,mod=12&sourceid=chrome&ie=UTF-8
    const options = {
        host: "api.aixcoder.com",
        port: 443,
        path: "/predict",
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=utf-8",
            "content-length": buf.length,
        },
        // agent: keepaliveAgent,
    };
    return new Promise((resolve, reject) => {
        const _s = Date.now();
        const req = https.request(options, (res) => {
            console.log("STATUS: " + res.statusCode);
            //   console.log('HEADERS: ' + JSON.stringify(res.headers));
            res.setEncoding("utf8");
            let d = "";
            res.on("data", (chunk) => {
                console.log("BODY: " + chunk);
                d += chunk;
            });

            res.on("end", () => {
                console.log("took " + (Date.now() - _s) + "ms");
                resolve(d);
            });

            res.on("error", (e) => {
                console.log("problem with response: " + e.message);
                reject(e);
            });
        });

        req.on("error", (e) => {
            console.log("problem with request: " + e.message);
            reject(e);
        });
        req.write(buf);
        req.end();
    });
}

// receive message from master process
process.on("message", async (message) => {
    console.log("get message " + message);
    process.send("echo:" + message);
    const numberOfMailsSend = await sendReqAAA();

    // send response to master process
    process.send(numberOfMailsSend);
});
