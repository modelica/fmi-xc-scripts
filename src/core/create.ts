import * as path from "path";
import * as fs from "fs-extra";
import { getExports } from "./exports";
import { getImports } from "./imports";
import { exportDir, crossCheckDir } from "./defaults";
import { writeToolFile, parseLegacyToolFile, upgradeToolData } from "../io";
import { Reporter, ReportLevel } from "./report";
import { VendorDetails } from "@modelica/fmi-data";

import * as debug from "debug";
import * as ini from "ini";

const createDebug = debug("fmi:create-repo");

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
    let FMUs = path.join(root, exportDir);
    let crossChecks = path.join(root, crossCheckDir);

    // Make a directory for this vendor (if necessary)
    makeRepoDir(repo, tool, vendor);

    // Write vendor data file
    let vendorFile = path.join(repo, `${vendor.vendorId}.vendor`);
    fs.writeFileSync(vendorFile, ini.stringify(vendor));

    // Translate .info data into new .tool file
    // Find the .info file for this tool and copy it into the vender repository
    createDebug("Look for tool '%s'", tool);
    let legacyToolFile = `${tool}.info`;
    generateToolFile(root, repo, legacyToolFile);

    // Find all exports from this tool and copy them into the vendor specific repository
    createDebug("Collecting export directories for %s", tool);
    try {
        let edetails = await getExports(FMUs, d => d.export_tool == tool);
        copyFiles(exportDir, edetails, repo);
        createDebug("  Copied %d export directories", edetails.length);
    } catch (e) {
        report("Error while extracting export directories for " + tool + ": " + e.message, ReportLevel.Fatal);
    }

    // Extract all cross check (FMU import) data for the given tool and copy it to the
    // new vendor specific repository
    createDebug("Collecting import directories for %s", tool);
    try {
        let idetails = await getImports(crossChecks, d => d.import_tool == tool);
        copyFiles(crossCheckDir, idetails, repo);
        createDebug("  Copied %d cross-check directories", idetails.length);
    } catch (e) {
        report("Error while extracting import directories for " + tool + ": " + e.message, ReportLevel.Fatal);
    }
}

/**
 * Make a repository (if it doesn't already exist) for the given vendor
 *
 * @param repo Repository for vendor specific files
 * @param tool Tool being processed
 * @param vendor Vendor being processed
 */
function makeRepoDir(repo: string, tool: string, vendor: VendorDetails) {
    if (!fs.existsSync(repo)) {
        createDebug("Creating directory " + repo);
        fs.mkdirpSync(repo);
    } else {
        createDebug("Directory " + repo + " already exists");
    }
    console.log("Adding tool " + tool + " to repository for vendor " + vendor.vendorId + " at " + repo);
}

/**
 * Generate a .tool file in the vendor repository for the tool being processed
 *
 * @param root Root of SVN files
 * @param repo Repository for vendor specific files
 * @param legacyToolFile Legacy tool file
 * @param vendor Vendor being processed
 */
function generateToolFile(root: string, repo: string, legacyToolFile: string) {
    let fullLegacyToolFileName = path.join(root, "tools", legacyToolFile);
    createDebug("  Looking for legacy tool file at %s", fullLegacyToolFileName);
    if (fs.existsSync(fullLegacyToolFileName)) {
        let dst = path.join(repo, legacyToolFile.replace(".info", ".tool"));
        let legacy = parseLegacyToolFile(fullLegacyToolFileName);
        createDebug("    Legacy tool data: %j", legacy);
        let next = upgradeToolData(legacy);
        createDebug("    New .tool file content: %j", next);
        writeToolFile(dst, next);
        createDebug("Translated legacy tool information file from '%s' to '%s'", fullLegacyToolFileName, dst);
    } else {
        throw new Error("No legacy tool file named '" + fullLegacyToolFileName + "' found");
    }
}

/**
 * This function copies a collection of files from one place to another providing
 * progress information as it goes.
 *
 * @param details A list of files to be moved
 * @param repo Vendor repository to move them to
 */
function copyFiles(dst: string, details: Array<{ rel: string; dir: string }>, repo: string) {
    details.forEach((match, index) => {
        let from = match.dir;
        let to = path.join(repo, dst, match.rel);

        let per = (100 * index / details.length).toFixed(0);
        process.stdout.write(` [${per}%]  \r`);
        fs.copySync(from, to, {
            recursive: true,
        });
    });
}
