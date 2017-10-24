import { infoFiles, parseInfo } from './utils';
import * as debug from 'debug';
import * as yargs from 'yargs';
import * as path from 'path';

let argv = yargs
    .default('repo', null)
    .argv;

if (!argv.repo) {
    console.error("Must specify repo directory");
    process.exit(1);
}

const extractDebug = debug("extract");
extractDebug.enabled = true;

run()

export async function run() {
    // Extract data from vendor repository

    // Read external tools database
    //   Set of all tools
    //   Which tools are "owned" by which repos

    // Read tool files
    let tools = infoFiles(argv.repo);
    extractDebug("Info files found: %j", tools);
    tools.forEach((toolFile) => {
        let config = parseInfo(path.join(argv.repo, toolFile));
        console.log("config = ", config);
    })

    //   Parse info files
    //   Collect set of tools we expect to find locally

    // Validation: If tool already in external database, confirm it has THIS repo associated with it

    // Process exports
    //   Find all directories of appropriate length
    //   Validation: Check that path values make sense
    //     - Version
    //     - Variant
    //     - Platform
    //     - Export tool name (in list of tools owned by this repo)
    //     - Export version (anything to do here?)
    //     - Model (matches FMU name)
    //   Build FMUTable

    // Process cross checks
    //   Find all directories of appropriate length
    //   Validation: 
    //     - Version
    //     - Variant
    //     - Platform
    //     - Export tool name (in list of tools owned by this repo)
    //     - Export version (anything to do here?)
    //     - Import tool name (in database)
    //     - Import version (in database?)
    //     - Model (matches FMU name)

    // Write out: tools.json (ToolsTable)
    // Write out: fmus.json (FMUTable)
    // Write out: xc_results.json (CrossCheckTable)

}
