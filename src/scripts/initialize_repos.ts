import * as yargs from 'yargs';
import * as path from 'path';
import { SVN, infoFiles, reporter, ReportLevel, createRepo, processRepo } from '../core';
import { createDatabase } from '../db';

const argv = yargs
    .string('repodir')
    .default('repodir', null)
    .string('root')
    .default('root', SVN)
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

async function run() {
    let report = reporter(argv.pedantic ? ReportLevel.Minor : ReportLevel.Major);
    let files = await infoFiles(path.join(argv.root, "tools"));
    let db = createDatabase(argv.db);
    for (let file of files) {
        let tool = file.replace(".info", "");
        let rdir = path.join(argv.repodir, tool);
        if (argv.create) {
            console.log(`Create repo for tool ${tool} in ${rdir} pulling data from ${argv.root}`);
            await createRepo(tool, rdir, argv.root, report);
        }
        if (argv.process) {
            try {
                console.log(`  Processing tool data in repo for tool ${tool}`);
                let lower = tool.toLowerCase();
                let repo = `git@github.com:modelica/fmixc-${lower}`
                let artifactsDir = path.join(rdir, "artifacts");
                await processRepo(db, rdir, repo, artifactsDir, false, report);
            } catch (e) {
                console.error("Error while processing tool " + tool + ": ", e.message);
            }
        }
    }
    if (argv.process && argv.imports) {
        for (let file of files) {
            let tool = file.replace(".info", "");
            let rdir = path.join(argv.repodir, tool);
            try {
                console.log(`  Processing import data in repo for tool ${tool}`);
                let lower = tool.toLowerCase();
                let repo = `git@github.com:modelica/fmixc-${lower}`
                let artifactsDir = path.join(rdir, "artifacts");
                await processRepo(db, rdir, repo, artifactsDir, true, report);
            } catch (e) {
                console.error("Error while processing tool " + tool + ": ", e.message);
            }
        }
    }
}

run().catch((e) => console.error(e));
