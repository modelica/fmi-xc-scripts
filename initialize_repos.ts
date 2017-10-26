import * as yargs from 'yargs';
import * as path from 'path';
import { SVN } from './exports';
import { infoFiles, reporter } from './utils';
import { createRepo } from './repo';
import { processRepo } from './extract';

const argv = yargs
    .string('repodir')
    .default('repodir', null)
    .string('root')
    .default('root', SVN)
    .boolean('process')
    .default('process', true)
    .boolean('imports')
    .default('imports', true)
    .argv;

if (!argv.repodir) {
    console.error("No repository directory specified, use --repodir");
    process.exit(2);
}

async function run() {
    let report = reporter();
    let files = await infoFiles(path.join(argv.root, "tools"));
    for (let file of files) {
        let tool = file.replace(".info", "");
        let rdir = path.join(argv.repodir, tool);
        console.log(`Create repo for tool ${tool} in ${rdir} pulling data from ${argv.root}`);
        await createRepo(tool, rdir, argv.root, report);
        if (argv.process) {
            try {
                console.log(`  Processing tool data in repo for tool ${tool}`);
                let lower = tool.toLowerCase();
                let repo = `git@github.com:modelica/fmixc-${lower}`
                let artifactsDir = path.join(rdir, "artifacts");
                await processRepo(rdir, repo, artifactsDir, false, report);
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
                await processRepo(rdir, repo, artifactsDir, true, report);
            } catch (e) {
                console.error("Error while processing tool " + tool + ": ", e.message);
            }
        }
    }
}

run().catch((e) => console.error(e));
