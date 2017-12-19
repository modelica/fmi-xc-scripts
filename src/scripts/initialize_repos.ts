#!/usr/bin/env node

import * as yargs from 'yargs';
import * as path from 'path';
import { infoFiles, reporter, ReportLevel, createRepo, processRepo } from '../core';
import { createDatabase } from '../db';
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
    .string('db')
    .default('db', 'github')
    .boolean('create')
    .default('create', true)
    .boolean('process')
    .default('process', true)
    .boolean('imports')
    .default('imports', true)
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
async function run() {
    let report = reporter(argv.pedantic ? ReportLevel.Minor : ReportLevel.Major);
    let files = await infoFiles(path.join(argv.root, "tools"));
    initDebug("Info files: %j", files);
    let db = createDatabase(argv.db);
    for (let file of files) {
        let toolname = file.replace(".info", "");
        let vendor = vendorInfo(file);

        let rdir = path.join(argv.repodir, vendor.vendorId);
        if (argv.create) {
            console.log(`Create repo for tool ${toolname} in ${rdir} pulling data from ${argv.root}`);
            await createRepo(vendor, toolname, rdir, argv.root, report);
        }
        if (argv.process) {
            try {
                console.log(`  Processing tool data in repo for vendor ${vendor}`);
                let artifactsDir = path.join(rdir, "artifacts");
                await processRepo(db, rdir, vendor.repo, artifactsDir, false, true, report);
            } catch (e) {
                console.error("Error while processing vendor " + vendor + ": ", e.message);
            }
        }
    }
    if (argv.process && argv.imports) {
        for (let file of files) {
            let toolname = file.replace(".info", "");
            let vendor = vendorInfo(file);
            let rdir = path.join(argv.repodir, toolname);
            try {
                console.log(`  Processing import data in repo for tool ${toolname}`);
                let artifactsDir = path.join(rdir, "artifacts");
                await processRepo(db, rdir, vendor.repo, artifactsDir, true, true, report);
            } catch (e) {
                console.error("Error while processing tool " + toolname + ": ", e.message);
            }
        }
    }
}

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
