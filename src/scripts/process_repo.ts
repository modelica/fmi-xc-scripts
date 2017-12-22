#!/usr/bin/env node

import * as yargs from 'yargs';
import { processRepo, consoleReporter, logReporter, ReportLevel, enumerateErrors } from '../core';
import { loadVendorData } from '../io';
import { createDatabase } from '../db';

import * as debug from 'debug';
const processDebug = debug("fmi:process");

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
    .default('pedantic', false)
    .boolean('moved')
    .default('moved', false)
    .string('logfile')
    .default('logfile', null)
    .argv;

let dirs = argv._;
if (dirs.length == 0) {
    console.error("Must specify directories to process");
    process.exit(1);
}

let min = ReportLevel.Minor;
if (!argv.pedantic) {
    min = ReportLevel.Major;
}

let report = argv.logfile ? logReporter(min, argv.logfile) : consoleReporter(min);

async function run() {
    // Create and open database
    let db = createDatabase(argv.db, argv.output, argv.repo, argv.branch);
    await db.open();
    processDebug("Database opened...");

    // Loop over all directories to be processed
    for (let i = 0; i < dirs.length; i++) {
        let dir = dirs[i];
        processDebug("Processing contents of directory: %s", dir);
        try {
            // Load the vendor data for this repository
            let vendor = loadVendorData(dir);
            // Process contents and update database
            await processRepo(db, dir, vendor.vendorId, argv.imports, report.reporter);
        } catch (e) {
            console.error("Error while processing directory '" + dir + "', skipping: " + e.message);
        }
    }

    // Commit changes and close database
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
