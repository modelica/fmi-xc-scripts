import { infoFiles, parseInfo, validate, validateExport, validateImport, buildTable, Reporter, ReportLevel } from './utils';
import { loadTools, pushTools, pushFMUs, pushCrossChecks } from './db';
import { ToolSummary, FMUTable, parsePlatform, parseVariant, parseVersion, CrossCheckTable } from './schemas';
import { getExports } from './exports';
import { getImports } from './imports';
import * as debug from 'debug';
import * as path from 'path';
import * as fs from 'fs';

const stepsDebug = debug("extract:steps");
//stepsDebug.enabled = true;
const dataDebug = debug("extract:data");
//dataDebug.enabled = true;

export async function processRepo(dir: string, repo: string, artifactsDir: string, imports: boolean, report: Reporter) {
    // Read external tools database
    stepsDebug("Processing repo %s located in '%s'", repo, dir);
    stepsDebug("  Artifacts directory: %s", artifactsDir);
    stepsDebug("  Process imports: %j", imports);
    stepsDebug("Loading external tools");
    let existing = await loadTools();

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
        let config = parseInfo(path.join(dir, toolFile), repo);
        dataDebug("Loaded the following tool configuration data: %o", config);
        let exists = toolMap.get(config.id);
        if (exists && exists.repo != repo) throw new Error(`This repo (at ${repo}) defines tool '${config.id}' which was already defined in repo ${exists.repo}`);
        stepsDebug("Adding tool '%s' to tool map", config.id);
        toolMap.set(config.id, config);
        local.push(config.id);
    });

    // Process exports
    //   Find all directories of appropriate length
    try {
        let fmuDir = path.join(dir, "Test_FMUs");
        if (fs.existsSync(fmuDir)) {
            let allExports = await getExports(fmuDir);
            dataDebug("All export directories: %o", allExports);
            let exports = validate(allExports, validateExport(local), report);
            dataDebug("Validated export directories: %o", exports);
            //   Build FMUTable
            let fmus: FMUTable = exports.map((ex) => {
                let version = parseVersion(ex.fmi); // TODO: change to ex.version
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
                    exporter: ex.exporter,
                }
            })

            // Write out: fmus.json (FMUTable)
            await pushFMUs(fmus, local, artifactsDir);
        }
    } catch (e) {
        report("Error while processing exports in " + dir + ": " + e.message, ReportLevel.Fatal);
    }

    let xcdir = path.join(dir, "CrossCheck_Results");
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
            await pushCrossChecks(xc, local, artifactsDir);
        } catch (e) {
            report("Error while processing imports in " + dir + ": " + e.message, ReportLevel.Fatal);
            console.log(e);
        }
    } else {
        if (fs.existsSync(xcdir)) stepsDebug("Skipping import data");
        else stepsDebug("No cross check check directory, skipping");
    }

    // Write out: tools.json (ToolsTable)
    // TODO: We could write this earlier if we ditch the platforms stuff
    await pushTools(toolMap, local, artifactsDir);
}

