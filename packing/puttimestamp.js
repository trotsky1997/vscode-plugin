var fs = require("fs");
var path = require("path");

var changelogPath = path.join(__dirname, "..", "CHANGELOG.md");
var changelog = fs.readFileSync(changelogPath, "utf-8");
var date = new Date();
function appendZeros(m) {
    return ('0' + m).slice(-2);
}
changelog = changelog.replace("%DATE%", `${date.getFullYear()}-${appendZeros(date.getMonth() + 1)}-${appendZeros(date.getDate())}`);
fs.writeFileSync(changelogPath, changelog, "utf-8");