import * as path from 'path';
import * as fs from 'fs-extra';
import { getExports } from './exports';
import { getImports } from './imports';
import { exportDir } from './defaults';
import { Reporter, ReportLevel } from './utils';
import { VendorDetails } from '@modelica/fmi-data';

import * as debug from 'debug';
import * as ini from 'ini';

const createDebug = debug("extract:create-repo");

/**
 * Search the legacy SVN directory and extract data about a specific tool and then
 * reconstitute that data in the new vendor specific repo format.
 * 
 * @param tool Tool whose repository we are creating
 * @param repo Directory (on the file system) that contains the vendor specific repository data
 * @param root Root of the legacy SVN file structure
 * @param report A means for reporting issues
 */
export async function createRepo(vendor: VendorDetails, tool: string, repo: string, root: string, report: Reporter) {
    // Determine where FMUs and cross check results are stored based on **legacy** SVN
    // repository structure.
    let FMUs = path.join(root, "Test_FMUs");
    let crossChecks = path.join(root, "CrossCheck_Results");

    if (!fs.existsSync(repo)) {
        console.log("Creating directory " + repo);
        fs.mkdirpSync(repo);
    } else {
        console.log("Directory " + repo + " already exists");
    }
    console.log("Adding to " + tool + " to repository for vendor " + vendor.id + " at " + repo);

    // Write vendor data file
    let vendorFile = path.join(repo, "vendor.ini");
    fs.writeFileSync(vendorFile, ini.stringify(vendor));

    // Find the .info file for this tool and copy it into the vender repository
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

    // Find all exports from this tool and copy them into the vendor specific repository
    createDebug("Collecting export directories for %s", tool);
    try {
        let edetails = await getExports(FMUs, (d) => d.export_tool == tool);
        edetails.forEach((match, index) => {
            let from = path.join(match.dir);
            let to = path.join(repo, exportDir, match.rel);

            let per = (100 * index / edetails.length).toFixed(0);
            process.stdout.write(` [${per}%] \r`);
            fs.copySync(from, to, {
                recursive: true,
            });
        });
    } catch (e) {
        report("Error while extracting export directories for " + tool + ": " + e.message, ReportLevel.Fatal);
    }

    // Extract all cross check (FMU import) data for the given tool and copy it to the
    // new vendor specific repository
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
