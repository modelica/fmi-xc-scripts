#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { infoFiles, reporter, ReportLevel, createRepo, enumerateErrors } from '../core';
import * as fs from 'fs';
import * as ini from 'ini';
import { VendorDetails } from '@modelica/fmi-data';

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

function vendorInfo(file: string): VendorDetails {
    initDebug("Reading info for %s", file);
    let contents = fs.readFileSync(path.join(argv.root, "tools", file), 'utf-8');
    let obj = ini.parse(contents);
    initDebug("  INI contents: %j", obj);
    let vendor = obj["Tool"]["vendor"];
    initDebug("  Vendor ID: %s", vendor);

    let repo = `git@github.com:fmi-xc/${vendor}`
    initDebug("  Repository: %s", repo);

    return {
        vendorId: vendor,
        displayName: vendor,
        href: obj["Tool"]["href"],
        email: obj["Tool"]["email"],
        repo: repo,
    };
}

let report = reporter(argv.pedantic ? ReportLevel.Minor : ReportLevel.Major);

async function run() {
    let files = await infoFiles(path.join(argv.root, "tools"));
    initDebug("Info files: %j", files);
    for (let file of files) {
        let toolname = file.replace(".info", "");
        let vendor = vendorInfo(file);

        let rdir = path.join(argv.repodir, vendor.vendorId);
        console.log(`Create repo for tool ${toolname} in ${rdir} pulling data from ${argv.root}`);
        await createRepo(vendor, toolname, rdir, argv.root, report.reporter);
    }
}

run().then(() => {
    process.exit(enumerateErrors(report.errors));
}).catch((e) => {
    console.error("initializeRepo failed: " + e.message);
    process.exit(1);
});
