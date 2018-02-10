import { findFilesWithSuffix, validate } from "./utils";
import { buildToolSummaryFromToolFile } from "../io";
import { Reporter, ReportLevel } from "./report";
import { Database } from "../db";
import {
    FMUTable,
    parsePlatform,
    parseVariant,
    parseVersion,
    CrossCheckTable,
    VendorDetails,
} from "@modelica/fmi-data";
import { getExports, validateExport } from "./exports";
import { getImports, validateImport, buildCrossCheckTable } from "./imports";
import { exportDir, crossCheckDir } from "./defaults";
import * as debug from "debug";
import * as path from "path";
import * as fs from "fs";

const stepsDebug = debug("fmi:steps");
const dataDebug = debug("fmi:data");

/**
 * This function is called by the process_repo script.  The purpose of this function is to
 * extract information from vendor repositories, validate it against existing tools listed
 * in a database, merge the vendor data into the existing data and, finally, push that
 * merged data back into the database.
 *
 * @param db Database instance to interact with
 * @param dir Directory to process
 * @param vendorId The id of the vendor we are processing
 * @param artifactsDir Where to place artifacts generated as part of this process
 * @param imports Whether to include processing of imported FMUs
 * @param report A means to report issues during processing.
 */
export async function processRepo(
    db: Database,
    dir: string,
    vendor: VendorDetails,
    imports: boolean,
    report: Reporter,
) {
    // Read external tools database
    stepsDebug("Processing repo in %s owned by %s", dir, vendor.vendorId);
    stepsDebug("  Process imports: %j", imports);
    stepsDebug("Loading external tools");

    // Read tool files and fold them into the tool map as well (making sure the tools we define
    // in this repo haven't already been defined in a diffrent repo).
    let tools = findFilesWithSuffix(dir, "tool");
    stepsDebug("Info files found: %j", tools);

    let summaries = tools.map(toolFile => buildToolSummaryFromToolFile(path.join(dir, toolFile), report, vendor));
    let local = summaries.map(data => data.id);
    dataDebug("  Summaries: %j", summaries);
    dataDebug("  Local tools: %j", local);

    // Update database with tool information
    await db.updateTools(summaries, vendor.vendorId);

    // Process exports by searching the exports directory (see `exportDir` constant)
    //   Find all directories of appropriate length
    try {
        let fmuDir = path.join(dir, exportDir);

        // If there is a directory for exported FMUs...
        if (fs.existsSync(fmuDir)) {
            let allExports = await getExports(fmuDir);
            dataDebug("All export directories: %o", allExports);
            let exports = validate(allExports, validateExport(local), report);
            dataDebug("Validated export directories: %o", exports);

            let fmus: FMUTable = [];
            //   Build FMUTable
            exports.forEach(ex => {
                let version = parseVersion(ex.fmi_version);
                let variant = parseVariant(ex.variant);
                let platform = parsePlatform(ex.platform);
                if (version == null) {
                    report("Invalid version " + ex.fmi_version + " found in " + ex.dir, ReportLevel.Major);
                    return;
                }
                if (variant == null) {
                    report("Invalid variant " + ex.variant + " found in " + ex.dir, ReportLevel.Major);
                    return;
                }
                if (platform == null) {
                    report("Invalid platform " + ex.platform + " found in " + ex.dir, ReportLevel.Major);
                    return;
                }
                fmus.push({
                    name: ex.model,
                    vendorId: vendor.vendorId,
                    version: version,
                    variant: variant,
                    platform: platform,
                    export_tool: ex.export_tool,
                    export_version: ex.export_version,
                });
            });

            // Write out: fmus.json (FMUTable)
            await db.updateFMUs(fmus, vendor.vendorId);
        }
    } catch (e) {
        report("Error while processing exports in " + dir + ": " + e.message, ReportLevel.Fatal);
    }

    // Now check for cross check results
    let xcdir = path.join(dir, crossCheckDir);
    if (imports && fs.existsSync(xcdir)) {
        try {
            stepsDebug("Processing cross-check data");
            // Process cross checks
            //   Find all directories of appropriate length
            let allImports = await getImports(xcdir);
            let imports = validate(allImports, validateImport, report);
            dataDebug("Import directories: %o", imports);
            let xc: CrossCheckTable = buildCrossCheckTable(imports, vendor.vendorId, report);

            // Write out: xc_results.json (CrossCheckTable)
            await db.updateCrossChecks(xc, vendor.vendorId);
        } catch (e) {
            report("Error while processing imports in " + dir + ": " + e.message, ReportLevel.Fatal);
        }
    } else {
        if (fs.existsSync(xcdir)) stepsDebug("Skipping import data");
        else stepsDebug("No cross check directory named " + xcdir + ", skipping");
    }
}
