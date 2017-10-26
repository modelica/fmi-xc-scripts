import * as yargs from 'yargs';
import { SVN } from './exports';
import { createRepo } from './repo';
import { reporter } from './utils';

let argv = yargs
    .string('tool')
    .default('tool', null)
    .string('repo')
    .default('repo', null)
    .string('root')
    .default('root', SVN)
    .argv;

if (!argv.repo) {
    console.error("Must specify repo directory");
    process.exit(1);
}

if (argv.tool) {
    createRepo(argv.tool, argv.repo, argv.root, reporter()).catch((e) => {
        console.error(e);
    })
} else {
    console.error("No value provided for --tool");
    process.exit(1);
}
