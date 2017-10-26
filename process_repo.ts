import * as yargs from 'yargs';
import * as path from 'path';
import { processRepo } from './extract';
import { reporter, ReportLevel } from './utils';

let argv = yargs
    .string('artifacts')
    .default('artifacts', 'artifacts')
    .string('dir')
    .default('dir', null)
    .string('repo')
    .default('repo', null)
    .boolean('imports')
    .default('imports', true)
    .boolean('pedatic')
    .default('pedantic', true)
    .argv;

if (!argv.dir) {
    console.error("Must specify directory to be processed");
    process.exit(1);
}

if (!argv.repo) {
    console.error("Must specify a repository URL");
    process.exit(1);
}

let artifactsDir = path.join(argv.dir, argv.artifacts);
let min = ReportLevel.Minor;

if (argv.pedantic) {
    min = ReportLevel.Major;
}
let report = reporter(min);

processRepo(argv.dir, argv.repo, artifactsDir, argv.imports, report).catch((e) => {
    console.error(e);
})