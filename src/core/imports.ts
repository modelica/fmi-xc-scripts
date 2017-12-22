import { ExportDetails, Predicate } from './exports';
import { getDirectories } from './utils';
import { Reporter, ReportLevel } from './report';
import { parsePlatform, parseVariant, parseVersion } from '@modelica/fmi-data';

import * as path from 'path';
import * as fs from 'fs';

import * as debug from 'debug';
const importDebug = debug("fmi:imports");

/**
 * Details about imported FMUs.  It turns out they are the same details we collect
 * for exported FMUs + information about the importing tool.
 */
export interface ImportDetails extends ExportDetails {
    import_tool: string;
    import_version: string;
}

/**
 * Extract information about imported FMUs from path
 * 
 * @param dir Root directory being processed.
 * @param rel Directory where cross check data was found
 * @param parts Components of the `rel` path
 */
function parseImport(dir: string, rel: string, parts: string[]): ImportDetails {
    return {
        dir: dir,
        rel: rel,
        fmi_version: parts[0],
        variant: parts[1],
        platform: parts[2],
        import_tool: parts[3],
        import_version: parts[4],
        export_tool: parts[5],
        export_version: parts[6],
        model: parts[7],
    };
}

/**
 * Locate all imported FMUs in a given directory (subject to a given criteria)
 * 
 * @param root Directory to search for imported FMUs
 * @param pred A predicate for filter which imported FMUs to consider
 */
export async function getImports(root: string, pred?: Predicate<ImportDetails>): Promise<ImportDetails[]> {
    let predicate: Predicate<ImportDetails> = pred || (() => true);
    importDebug("Looking for imports in '%s'", root);
    let dirs = await getDirectories(root);
    let ret: ImportDetails[] = [];
    importDebug("  Looking for directories that match our selection criteria");
    dirs.forEach((directory) => {
        // If the path has 8 parts, assume this directory is corresponds to
        // an imported FMUs
        if (directory.parts.length == 8) {
            let details = parseImport(directory.dir, directory.rel, directory.parts);
            if (predicate(details)) {
                ret.push(details);
            }
        }
    })
    return ret;
}


/**
 * Returns a function that validates import details.
 * 
 * @param local List of tools local to the repository currently being processed.
 * @param tools List of all tools
 */
export function validateImport(x: ImportDetails, reporter: Reporter): void {
    if (parseVersion(x.fmi_version) == null) reporter(`Unknown FMI version '${x.fmi_version}'`, ReportLevel.Major);
    if (parseVariant(x.variant) == null) reporter(`Unknown FMI variant '${x.variant}'`, ReportLevel.Major);
    if (parsePlatform(x.platform) == null) reporter(`Unknown FMI platform '${x.platform}'`, ReportLevel.Major);
    let passedFile = path.join(x.dir, "passed");
    if (fs.existsSync(passedFile)) {
        let csvName = x.model + "_out.csv";
        if (!fs.existsSync(path.join(x.dir, csvName))) reporter(`No CSV file named ${csvName} found in ${x.dir}`, ReportLevel.Minor);
    }
    if (!fs.existsSync(path.join(x.dir, "ReadMe.txt")) && !fs.existsSync(path.join(x.dir, "ReadMe.pdf"))) {
        reporter(`No ReadMe.txt or ReadMe.pdf found in ${x.dir}`, ReportLevel.Minor);
    }
}

