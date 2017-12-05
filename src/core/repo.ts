import * as path from 'path';
import * as fs from 'fs-extra';
import { getExports } from './exports';
import { getImports } from './imports';
import { Reporter, ReportLevel } from './utils';

import * as debug from 'debug';
const createDebug = debug("extract:create-repo");
// createDebug.enabled = true;

export async function createRepo(tool: string, repo: string, root: string, report: Reporter) {
    let FMUs = path.join(root, "Test_FMUs");
    let crossChecks = path.join(root, "CrossCheck_Results");
    console.log("Creating repository for " + tool);

    createDebug("Look for tool '%s'", tool);
    let toolFileName = `${tool}.info`;
    let toolFile = path.join(root, "tools", toolFileName);
    if (fs.existsSync(toolFile)) {
        let dst = path.join(repo, toolFileName)
        createDebug("Copying tool information file from '%s' to '%s'", toolFile, dst);
        fs.copySync(toolFile, dst);
    } else {
        throw new Error("No tool file named '" + toolFile + "' found");
    }

    createDebug("Collecting export directories for %s", tool);
    try {
        let edetails = await getExports(FMUs, (d) => d.export_tool == tool);
        edetails.forEach((match, index) => {
            let from = path.join(match.dir);
            let to = path.join(repo, "Test_FMUs", match.rel);

            let per = (100 * index / edetails.length).toFixed(0);
            process.stdout.write(` [${per}%] \r`);
            fs.copySync(from, to, {
                recursive: true,
            });
        });
    } catch (e) {
        report("Error while extracting export directories for " + tool + ": " + e.message, ReportLevel.Fatal);
    }

    createDebug("Collecting import directories for %s", tool);
    try {
        let idetails = await getImports(crossChecks, (d) => d.import_tool == tool);
        idetails.forEach((match, index) => {
            let from = path.join(match.dir);
            let to = path.join(repo, "CrossCheck_Results", match.rel);

            let per = (100 * index / idetails.length).toFixed(0);
            process.stdout.write(` [${per}%] \r`);
            fs.copySync(from, to, {
                recursive: true,
            });
        });
    } catch (e) {
        report("Error while extracting import directories for " + tool + ": " + e.message, ReportLevel.Fatal);
        console.log(e);
    }
}
