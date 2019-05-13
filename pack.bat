call git checkout master && call vsce package -o community.vsix

call git checkout enterprise && call git merge master && call vsce package -o enterprise.vsix

call git checkout master

call node packing/changename.js