#!/usr/bin/env node

import * as yargs from 'yargs';
import { createRepo, consoleReporter, ReportLevel, enumerateErrors } from '../core';
import { createVendorDataFromLegacyToolFile } from '../io';

let argv = yargs
    .string('tool')
    .default('tool', null)
    .string('repo')
    .default('repo', null)
    .string('root')
    .default('root', null)
    .number('pedantic')
    .default('pedantic', true)
    .argv;

if (!argv.repo) {
    console.error("Must specify repo directory");
    process.exit(1);
}

let report = consoleReporter(argv.pedantic ? ReportLevel.Minor : ReportLevel.Major);

if (!argv.tool) {
    console.error("No value provided for --tool");
    process.exit(1);
}

if (!argv.repo) {
    console.error("No value provided for --repo");
    process.exit(3);
}

if (!argv.root) {
    console.error("No value provided for --root");
    process.exit(3);
}

async function run() {
    let vendor = createVendorDataFromLegacyToolFile(argv.root, `${argv.tool}.info`);
    return createRepo(vendor, argv.tool, argv.repo, argv.root, report.reporter);
}

run().then(() => {
    process.exit(enumerateErrors(report.errors));
}).catch((e) => {
    console.error("createRepo failed: " + e.message);
    process.exit(1);
})
