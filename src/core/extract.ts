import { infoFiles, parseInfo, validate, validateExport, validateImport, buildTable, Reporter, ReportLevel } from './utils';
import { Database } from '../db';
import { ToolSummary, FMUTable, parsePlatform, parseVariant, parseVersion, CrossCheckTable } from '@modelica/fmi-data';
import { getExports } from './exports';
import { getImports } from './imports';
import { exportDir, crossCheckDir } from './defaults';
import * as debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';

const stepsDebug = debug("extract:steps");
const dataDebug = debug("extract:data");

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
export async function processRepo(db: Database, dir: string, vendorId: string, artifactsDir: string | null, imports: boolean, moved: boolean, report: Reporter) {
    // Read external tools database
    stepsDebug("Processing repo in %s owned by %s", dir, vendorId);
    stepsDebug("  Artifacts directory: %s", artifactsDir);
    stepsDebug("  Process imports: %j", imports);
    stepsDebug("Loading external tools");

    // Extract any existing tools in the database
    let existing = await db.loadTools(artifactsDir);

    // Build a map that maps the tool name to it's details (checking for duplicates)
    let toolMap = new Map<string, ToolSummary>();
    existing.forEach((tool) => {
        let exists = toolMap.get(tool.id);
        if (exists) throw new Error("External tool base is corrupted, multiple tools with name " + tool.id);
        toolMap.set(tool.id, tool);
    });
    stepsDebug("Loaded information for the following tools: %j", toolMap.keys());

    // Read tool files and fold them into the tool map as well (making sure the tools we define
    // in this repo haven't already been defined in a diffrent repo).
    let tools = infoFiles(dir);
    let local: string[] = [];
    stepsDebug("Info files found: %j", tools);
    tools.forEach((toolFile) => {
        let config = parseInfo(path.join(dir, toolFile), vendorId);
        dataDebug("Loaded the following tool configuration data: %o", config);
        let exists = toolMap.get(config.id);
        if (exists && exists.vendorId != vendorId && !moved) throw new Error(`This repo (owned by ${vendorId}) defines tool '${config.id}' which was already owned by ${exists.vendorId}`);
        stepsDebug("Adding tool '%s' to tool map", config.id);
        toolMap.set(config.id, config);
        local.push(config.id);
    });

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
            //   Build FMUTable
            let fmus: FMUTable = exports.map((ex) => {
                let version = parseVersion(ex.fmi_version); // TODO: change to ex.version
                let variant = parseVariant(ex.variant);
                let platform = parsePlatform(ex.platform);
                if (version == null || variant == null || platform == null) {
                    throw new Error("Unacceptable value found in previously validated data, this should not happen");
                }
                return {
                    name: ex.model,
                    version: version,
                    variant: variant,
                    platform: platform,
                    export_tool: ex.export_tool,
                    export_version: ex.export_version,
                }
            })

            // Write out: fmus.json (FMUTable)
            await db.pushFMUs(fmus, local, artifactsDir);
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
            let allImports = await getImports(xcdir)
            let imports = validate(allImports, validateImport(local, Array.from(toolMap.keys())), report);
            dataDebug("Import directories: %o", imports);
            let xc: CrossCheckTable = buildTable(imports, report);

            // Write out: xc_results.json (CrossCheckTable)
            await db.pushCrossChecks(xc, local, artifactsDir);
        } catch (e) {
            report("Error while processing imports in " + dir + ": " + e.message, ReportLevel.Fatal);
        }
    } else {
        if (fs.existsSync(xcdir)) stepsDebug("Skipping import data");
        else stepsDebug("No cross check check directory, skipping");
    }

    // Write out: tools.json (ToolsTable)
    await db.pushTools(toolMap, local, artifactsDir);
}

