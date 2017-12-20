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

let min = ReportLevel.Minor;
if (argv.pedantic) {
    min = ReportLevel.Major;
}
let report = reporter(min);

let inifile = path.join(argv.dir, "vendor.ini")
let contents = fs.readFileSync(inifile, 'utf-8');
let obj = ini.parse(contents);
if (!obj["vendorId"]) {
    console.error("No 'vendorId' variable found in " + inifile);
    process.exit(3);
}
let vendor = obj["vendorId"];

async function run() {
    // TODO: Find vendor file and extract vendorId
    let db = createDatabase(argv.db, argv.artifacts);
    await db.open();
    await processRepo(db, argv.dir, vendor, argv.imports, argv.moved, report.reporter);
    await db.commit();
    await db.close();
}

run().then(() => {
    process.exit(report.numErrors());
}).catch((e) => {
    console.error("procesRepo failed: " + e.message);
    process.exit(1);
});
