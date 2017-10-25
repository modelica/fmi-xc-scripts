import { infoFiles, parseInfo, validate, validateExport, validateImport, buildTable } from './utils';
import { loadTools, pushTools, pushFMUs, pushCrossChecks } from './db';
import { ToolSummary, FMUTable, parsePlatform, parseVariant, parseVersion, CrossCheckTable } from './schemas';
import { getExports } from './exports';
import { getImports } from './imports';
import * as debug from 'debug';
import * as yargs from 'yargs';
import * as path from 'path';

let argv = yargs
    .string('artifacts')
    .default('artifacts', 'artifacts')
    .string('dir')
    .default('dir', null)
    .string('repo')
    .default('repo', null)
    .boolean('imports')
    .default('imports', true)
    .argv;

if (!argv.dir) {
    console.error("Must specify directory to be processed");
    process.exit(1);
}

if (!argv.repo) {
    console.error("Must specify a repository URL");
    process.exit(1);
}

const stepsDebug = debug("extract:steps");
//stepsDebug.enabled = true;
const dataDebug = debug("extract:data");
//dataDebug.enabled = true;

run()

export function reporter() {
    let reported = new Set<string>();
    return (msg: string) => {
        if (reported.has(msg)) return;
        reported.add(msg);
        console.warn("WARNING: " + msg);
    }
}

let artifactsDir = path.join(argv.dir, argv.artifacts);

export async function run() {
    // Keeping a list of any issues we found (non-fatal stuff that we skipped or ignored)
    let report = reporter();

    // Read external tools database
    stepsDebug("Loading external tools");
    let existing = await loadTools();

    // Build a map that maps the tool name to it's details (checking for duplicates)
    let toolMap = new Map<string, ToolSummary>();
    existing.forEach((tool) => {
        let exists = toolMap.get(tool.toolName);
        if (exists) throw new Error("External tool base is corrupted, multiple tools with name " + tool.toolName);
        toolMap.set(tool.toolName, tool);
    });
    stepsDebug("Loaded information for the following tools: %j", toolMap.keys());

    // Read tool files and fold them into the tool map as well (making sure the tools we define
    // in this repo haven't already been defined in a diffrent repo).
    let tools = infoFiles(argv.dir);
    let local: string[] = [];
    stepsDebug("Info files found: %j", tools);
    tools.forEach((toolFile) => {
        let config = parseInfo(path.join(argv.dir, toolFile), argv.repo);
        dataDebug("Loaded the following tool configuration data: %o", config);
        let exists = toolMap.get(config.toolName);
        if (exists && exists.repo != argv.repo) throw new Error(`This repo (at ${argv.repo}) defines tool '${config.toolName}' which was already defined in repo ${exists.repo}`);
        stepsDebug("Adding tool '%s' to tool map", config.toolName);
        toolMap.set(config.toolName, config);
        local.push(config.toolName);
    });

    // Process exports
    //   Find all directories of appropriate length
    let allExports = await getExports(path.join(argv.dir, "Test_FMUs"));
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

    // Write out: tools.json (ToolsTable)
    await pushTools(toolMap, artifactsDir);
    // Write out: fmus.json (FMUTable)
    await pushFMUs(fmus, artifactsDir);

    if (argv.imports) {
        stepsDebug("Processing cross-check data");
        // Process cross checks
        //   Find all directories of appropriate length
        let imports = validate(await getImports(path.join(argv.dir, "CrossCheck_Results")), validateImport(local, Array.from(toolMap.keys())), report);
        dataDebug("Import directories: %o", imports);
        let xc: CrossCheckTable = buildTable(imports, report);

        // Write out: xc_results.json (CrossCheckTable)
        await pushCrossChecks(xc, artifactsDir);
    } else {
        stepsDebug("Skipping import data");
    }
}

