#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { processRepo, reporter, ReportLevel, enumerateErrors } from '../core';
import { createDatabase } from '../db';
var ini = require('ini');
var fs = require('fs');

import * as debug from 'debug';
const processDebug = debug("fmi:process");
processDebug.enabled = true;

let argv = yargs
    .string('output')
    .default('output', null)
    .string('db')
    .default('db', 'file')
    .string('repo')
    .default('repo', 'git@github.com:xogeny/fmi-standard.org.git')
    .string('branch')
    .default('branch', 'testing')
    .boolean('imports')
    .default('imports', true)
    .boolean('pedatic')
    .default('pedantic', true)
    .boolean('moved')
    .default('moved', false)
    .argv;

let dirs = argv._;
if (dirs.length == 0) {
    console.error("Must specify directories to process");
    process.exit(1);
}

let min = ReportLevel.Minor;
if (argv.pedantic) {
    min = ReportLevel.Major;
}
let report = reporter(min);


async function run() {
    let db = createDatabase(argv.db, argv.output, argv.repo, argv.branch);
    await db.open();
    processDebug("Database opened...");
    for (let i = 0; i < dirs.length; i++) {
        let dir = dirs[i];
        processDebug("Processing contents of directory: %s", dir);
        try {
            let inifile = path.join(dir, "vendor.ini")
            let contents = fs.readFileSync(inifile, 'utf-8');
            let obj = ini.parse(contents);
            if (!obj["vendorId"]) {
                console.error("No 'vendorId' variable found in " + inifile);
                process.exit(3);
            }
            let vendor = obj["vendorId"];

            // TODO: Find vendor file and extract vendorId
            await processRepo(db, dir, vendor, argv.imports, report.reporter);
        } catch (e) {
            console.error("Error while processing directory '" + dir + "', skipping: " + e.message);
        }
    }
    await db.commit();
    processDebug("...committed changes to database...");
    await db.close();
    processDebug("...database closed");
}

run().then(() => {
    process.exit(enumerateErrors(report.errors));
}).catch((e) => {
    console.error("procesRepo failed: " + e.message);
    process.exit(1);
});
