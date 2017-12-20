#!/usr/bin/env node

import * as yargs from 'yargs';
import { createRepo, reporter, ReportLevel, enumerateErrors } from '../core';
import { VendorDetails } from '@modelica/fmi-data';

let argv = yargs
    .string('vendor')
    .default('vendor', null)
    .string('tool')
    .default('tool', null)
    .string('repo')
    .default('repo', null)
    .string('repouri')
    .default('repouri', null)
    .string('email')
    .default('email', null)
    .string('href')
    .default('href', null)
    .string('root')
    .default('root', null)
    .number('pedantic')
    .default('pedantic', true)
    .argv;

if (!argv.repo) {
    console.error("Must specify repo directory");
    process.exit(1);
}

let report = reporter(argv.pedantic ? ReportLevel.Minor : ReportLevel.Major);

if (!argv.tool) {
    console.error("No value provided for --tool");
    process.exit(1);
}

if (!argv.vendor) {
    console.error("No value provided for --vendor");
    process.exit(2);
}

if (!argv.repo) {
    console.error("No value provided for --repo");
    process.exit(3);
}

if (!argv.root) {
    console.error("No value provided for --root");
    process.exit(3);
}

if (!argv.repouri) {
    console.error("No value provided for --repouri");
    process.exit(4);
}

let vendor: VendorDetails = {
    vendorId: argv.vendor,
    displayName: argv.vendor,
    href: argv.href || "",
    email: argv.email || "",
    repo: argv.repouri,
}

createRepo(vendor, argv.tool, argv.repo, argv.root, report.reporter).then(() => {
    process.exit(enumerateErrors(report.errors));
}).catch((e) => {
    console.error("createRepo failed: " + e.message);
    process.exit(1);
})
