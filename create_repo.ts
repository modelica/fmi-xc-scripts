import * as yargs from 'yargs';
import * as path from 'path';
import { getExports, FMUs, SVN } from './exports';
import { getImports, CrossChecks } from './imports';
import * as fs from 'fs-extra';

let argv = yargs
    .default('tool', null)
    .default('repo', null)
    .argv;

if (!argv.repo) {
    console.error("Must specify repo directory");
    process.exit(1);
}

if (argv.tool) {
    console.log("Look for tool '" + argv.tool + "'");
    let toolFileName = `${argv.tool}.info`;
    let toolFile = path.join(SVN, "tools", toolFileName);
    if (fs.existsSync(toolFile)) {
        console.log("Copying tool information file from " + toolFile + " to " + path.join(argv.repo, toolFileName));
        fs.copySync(toolFile, path.join(argv.repo, toolFileName));
    } else {
        throw new Error("No tool file named '" + toolFile + "' found");
    }

    getExports(FMUs, (d) => d.exporter.tool == argv.tool).then((details) => {
        console.log("Copying exported FMUs");
        details.forEach((match) => {
            let from = path.join(match.dir);
            let to = path.join(argv.repo, "Test_FMUs", match.rel);

            console.log(`  Copying directory '${from}' to '${to}'`)
            fs.copySync(from, to, {
                recursive: true,
            });
        })
    });

    console.log("Copying imported FMUs");
    getImports(CrossChecks, (d) => d.importer.tool == argv.tool).then((details) => {
        console.log("Copying exported FMUs");
        details.forEach((match) => {
            let from = path.join(match.dir);
            let to = path.join(argv.repo, "CrossCheck_Results", match.rel);

            console.log(`  Copying directory '${from}' to '${to}'`)
            fs.copySync(from, to, {
                recursive: true,
            });
        })
    });
} else {
    console.error("No value provided for --tool");
    process.exit(1);
}
