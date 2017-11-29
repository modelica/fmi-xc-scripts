import * as yargs from 'yargs';
import { SVN, createRepo, reporter, ReportLevel } from '../core';

let argv = yargs
    .string('tool')
    .default('tool', null)
    .string('repo')
    .default('repo', null)
    .string('root')
    .default('root', SVN)
    .number('pedantic')
    .default('pedantic', true)
    .argv;

if (!argv.repo) {
    console.error("Must specify repo directory");
    process.exit(1);
}

let report = reporter(argv.pedantic ? ReportLevel.Minor : ReportLevel.Major);

if (argv.tool) {
    createRepo(argv.tool, argv.repo, argv.root, report).catch((e) => {
        console.error(e);
    })
} else {
    console.error("No value provided for --tool");
    process.exit(1);
}
