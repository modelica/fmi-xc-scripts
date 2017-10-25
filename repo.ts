import * as path from 'path';
import * as fs from 'fs-extra';
import { getExports } from './exports';
import { getImports } from './imports';

export async function createRepo(tool: string, repo: string, root: string) {
    let FMUs = path.join(root, "Test_FMUs");
    let crossChecks = path.join(root, "CrossCheck_Results");
    console.log("Look for tool '" + tool + "'");
    let toolFileName = `${tool}.info`;
    let toolFile = path.join(root, "tools", toolFileName);
    if (fs.existsSync(toolFile)) {
        console.log("Copying tool information file from " + toolFile + " to " + path.join(repo, toolFileName));
        fs.copySync(toolFile, path.join(repo, toolFileName));
    } else {
        throw new Error("No tool file named '" + toolFile + "' found");
    }

    console.log("Collecting export directories for " + tool);
    let edetails = await getExports(FMUs, (d) => d.exporter.tool == tool);
    edetails.forEach((match, index) => {
        let from = path.join(match.dir);
        let to = path.join(repo, "Test_FMUs", match.rel);

        let per = (100 * index / edetails.length).toFixed(0);
        process.stdout.write(` [${per}%] \r`);
        fs.copySync(from, to, {
            recursive: true,
        });
    });

    console.log("Collecting import directories for " + tool);
    let idetails = await getImports(crossChecks, (d) => d.importer.tool == tool);
    console.log("Copying exported FMUs");
    idetails.forEach((match, index) => {
        let from = path.join(match.dir);
        let to = path.join(repo, "CrossCheck_Results", match.rel);

        let per = (100 * index / idetails.length).toFixed(0);
        process.stdout.write(` [${per}%] \r`);
        fs.copySync(from, to, {
            recursive: true,
        });
    });

    // TODO: Create circle.yml
}
