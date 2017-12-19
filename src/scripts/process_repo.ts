#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { processRepo, reporter, ReportLevel } from '../core';
import { createDatabase } from '../db';
var ini = require('ini');
var fs = require('fs');

let argv = yargs
    .string('artifacts')
    .default('artifacts', null)
    .string('dir')
    .default('dir', ".")
    .string('db')
    .default('db', 'github')
    .boolean('imports')
    .default('imports', true)
    .boolean('pedatic')
    .default('pedantic', true)
    .boolean('moved')
    .default('moved', false)
    .argv;

if (!argv.dir) {
    console.error("Must specify directory to be processed");
    process.exit(1);
}

let artifactsDir = argv.artifacts ? path.join(argv.dir, argv.artifacts) : null;
let min = ReportLevel.Minor;

if (argv.pedantic) {
    min = ReportLevel.Major;
}
let report = reporter(min);
let db = createDatabase(argv.db);

let inifile = path.join(argv.dir, "vendor.ini")
let contents = fs.readFileSync(inifile, 'utf-8');
let obj = ini.parse(contents);
console.log("obj = ", obj);
if (!obj["vendorId"]) {
    console.error("No 'vendorId' variable found in " + inifile);
    process.exit(3);
}
let vendor = obj["vendorId"];
console.log("vendor = ", vendor);

processRepo(db, argv.dir, vendor, artifactsDir, argv.imports, argv.moved, report).catch((e) => {
    console.error(e);
    process.exit(1);
})