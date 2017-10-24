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
    run();
} else {
    console.error("No value provided for --tool");
    process.exit(1);
}

async function run() {
    console.log("Look for tool '" + argv.tool + "'");
    let toolFileName = `${argv.tool}.info`;
    let toolFile = path.join(SVN, "tools", toolFileName);
    if (fs.existsSync(toolFile)) {
        console.log("Copying tool information file from " + toolFile + " to " + path.join(argv.repo, toolFileName));
        fs.copySync(toolFile, path.join(argv.repo, toolFileName));
    } else {
        throw new Error("No tool file named '" + toolFile + "' found");
    }

    console.log("Collecting export directories for " + argv.tool);
    let edetails = await getExports(FMUs, (d) => d.exporter.tool == argv.tool);
    edetails.forEach((match, index) => {
        let from = path.join(match.dir);
        let to = path.join(argv.repo, "Test_FMUs", match.rel);

        let per = (100 * index / edetails.length).toFixed(0);
        process.stdout.write(` [${per}%] \r`);
        fs.copySync(from, to, {
            recursive: true,
        });
    });

    console.log("Collecting import directories for " + argv.tool);
    let idetails = await getImports(CrossChecks, (d) => d.importer.tool == argv.tool);
    console.log("Copying exported FMUs");
    idetails.forEach((match, index) => {
        let from = path.join(match.dir);
        let to = path.join(argv.repo, "CrossCheck_Results", match.rel);

        let per = (100 * index / idetails.length).toFixed(0);
        process.stdout.write(` [${per}%] \r`);
        fs.copySync(from, to, {
            recursive: true,
        });
    });

    // TODO: Create circle.yml
}
