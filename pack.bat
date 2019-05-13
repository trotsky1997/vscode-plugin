call git checkout master && call vsce package && call node packing/changename.js

call git checkout enterprise && call vsce package && call node packing/changename.js

call git checkout master