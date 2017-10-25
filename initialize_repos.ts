import * as yargs from 'yargs';
import * as path from 'path';
import { SVN } from './exports';
import { infoFiles } from './utils';
import { createRepo } from './repo';

const argv = yargs
    .string('repodir')
    .default('repodir', null)
    .string('root')
    .default('root', SVN)
    .argv;

if (!argv.repodir) {
    console.error("No repository directory specified, use --repodir");
    process.exit(2);
}

async function run() {
    let files = await infoFiles(path.join(argv.root, "tools"));
    for (let file of files) {
        let tool = file.replace(".info", "");
        let rdir = path.join(argv.repodir, tool);
        console.log(`Create repo for tool ${tool} in ${rdir} pulling data from ${argv.root}`);
        await createRepo(tool, rdir, argv.root);
    }
}

run();
