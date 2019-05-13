var fs = require("fs");
var path = require("path");

var packageJson = require("../package.json");
fs.renameSync(path.join(__dirname, "..", "community.vsix"), path.join(__dirname, "..", packageJson.name + "-" + packageJson.version + "-community.vsix"))
fs.renameSync(path.join(__dirname, "..", "enterprise.vsix"), path.join(__dirname, "..", packageJson.name + "-" + packageJson.version + "-enterprise.vsix"))
