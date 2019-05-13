var fs = require("fs");
var path = require("path");

var packageJson = require("../package.json");
fs.renameSync(path.join(__dirname, "..", packageJson.name + "-" + packageJson.version + ".vsix"), path.join(__dirname, "..", packageJson.name + "-" + packageJson.version + "-enterprise.vsix"))
