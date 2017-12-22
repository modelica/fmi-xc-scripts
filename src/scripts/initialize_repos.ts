#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { findFilesWithSuffix, consoleReporter, ReportLevel, createRepo, enumerateErrors } from '../core';
import { createVendorDataFromLegacyToolFile } from '../io';

import * as debug from 'debug';
const initDebug = debug("fmi:init");

const argv = yargs
    .string('repodir')
    .default('repodir', null)
    .string('root')
    .default('root', null)
    .number('pedantic')
    .default('pedantic', true)
    .argv;

if (!argv.repodir) {
    console.error("No repository directory specified, use --repodir");
    process.exit(2);
}

let report = consoleReporter(argv.pedantic ? ReportLevel.Minor : ReportLevel.Major);

async function run() {
    // Find all .info files
    let files = await findFilesWithSuffix(path.join(argv.root, "tools"), "info");
    initDebug("Info files: %j", files);

    // Loop over info files, constructing and populating vendor repositories tool by tool.
    for (let file of files) {
        try {
            let toolname = file.replace(".info", "");
            let vendor = createVendorDataFromLegacyToolFile(argv.root, file);

            let rdir = path.join(argv.repodir, vendor.vendorId);
            console.log(`Create repo for tool ${toolname} in ${rdir} pulling data from ${argv.root}`);
            await createRepo(vendor, toolname, rdir, argv.root, report.reporter);
        } catch (e) {
            report.reporter("Error while processing " + file + ": " + e.message, ReportLevel.Fatal);
        }
    }
}

run().then(() => {
    process.exit(enumerateErrors(report.errors));
}).catch((e) => {
    console.error("initializeRepo failed: " + e.message);
    process.exit(1);
});
