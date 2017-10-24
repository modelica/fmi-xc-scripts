var find = require('findit');
var path = require('path');

let root = "/Users/mtiller/Source/ModelicaAssociation/public/Test_FMUs";

var finder = find(root, {});

finder.on('directory', (dir, stat, stop) => {
    let rel = path.relative(root, dir);
    console.log("dir = ", dir);
    console.log("rel = ", rel);
    let parts = rel.split("/");
    console.log("parts = ", parts);
    let fmi = parts[0];
    let variant = parts[1];
    let platform = parts[2];
    let tool = parts[3];
    let version = parts[4];
    let model = parts[5];
})