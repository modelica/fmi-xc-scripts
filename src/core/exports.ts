import { getDirectories } from './utils';
import { Reporter, ReportLevel } from './report';
import { parsePlatform, parseVariant, parseVersion } from '@modelica/fmi-data';

import * as path from 'path';
import * as fs from 'fs';

import * as debug from 'debug';
const exportDebug = debug("fmi:exports");

export type Predicate<T> = (x: T) => boolean;

/**
 * Details to be extracted for each FMU listed as exported
 * by a given tool.
 */
export interface ExportDetails {
    // The root directory being searched for FMUs
    dir: string;
    // The relative path to the specific FMU being described
    rel: string;
    // Version string for the version of FMI supported
    fmi_version: string;
    // FMI variant that the exported FMU supports
    variant: string;
    // Platform that the exported FMU targets
    platform: string;
    // Name of the tool that exported the FMU
    export_tool: string;
    // Version string of the tool that exported the FMU
    export_version: string;
    // Name of the FMU
    model: string;
}

/**
 * Transformed the relative path of a directory into information about the
 * FMU being exported from that directory.
 * 
 * @param dir Root directory
 * @param rel Relative path
 * @param parts Parse of the relative path
 */
function parseExport(dir: string, rel: string, parts: string[]): ExportDetails {
    return {
        dir: dir,
        rel: rel,
        fmi_version: parts[0],
        variant: parts[1],
        platform: parts[2],
        export_tool: parts[3],
        export_version: parts[4],
        model: parts[5],
    };
}

/**
 * Find all directories containing exported FMUs.  This is done mainly by parsing the path
 * of each directory (relative to the root directory) and then passing the details to
 * `parseExport`.
 * 
 * @param root Root directory to search
 * @param pred Predicate to determine what to include
 */
export async function getExports(root: string, pred?: Predicate<ExportDetails>): Promise<ExportDetails[]> {
    let predicate: Predicate<ExportDetails> = pred || (() => true);
    exportDebug("Looking for exported FMUs in '%s'", root);
    let dirs = await getDirectories(root);
    let ret: ExportDetails[] = [];
    exportDebug("  Looking for directories that match our selection criteria");
    dirs.forEach((directory) => {
        // If there are 6 parts, then call parseExport to formulate
        // the details for this particular directory.
        if (directory.parts.length == 6) {
            let details = parseExport(directory.dir, directory.rel, directory.parts);
            if (predicate(details)) {
                ret.push(details);
            }
        }
    })
    return ret;
}

/**
 * Return a function that can be used to validate ExportDetails.
 * 
 * @param local List of tools local to the repository currently being processed.
 */
export function validateExport(local: string[]) {
    return (x: ExportDetails, reporter: Reporter): void => {
        let idx = local.indexOf(x.export_tool);
        if (idx == -1) {
            let names = local.join(", ");
            reporter(`Tool '${x.export_tool}' is not among list of tools defined in this repo: ${names}`, ReportLevel.Major);
        }
        if (parseVersion(x.fmi_version) == null) reporter(`Unknown FMI version '${x.fmi_version}'`, ReportLevel.Major);
        if (parseVariant(x.variant) == null) reporter(`Unknown FMI variant '${x.variant}'`, ReportLevel.Major);
        if (parsePlatform(x.platform) == null) reporter(`Unknown FMI platform '${x.platform}'`, ReportLevel.Major);
        let requiredFiles = [
            '.fmu', '_ref.csv', '_in.csv', '_cc.log', '_cc.csv', '_ref.opt',
        ];
        // TODO: Check for Readme?
        // TODO: Check for batch
        for (let suffix of requiredFiles) {
            let fileName = `${x.model}${suffix}`
            if (!fs.existsSync(path.join(x.dir, fileName))) reporter(`Expected to find a file named ${fileName} in ${x.dir}`, ReportLevel.Major);
        }
        if (!fs.existsSync(path.join(x.dir, "ReadMe.txt")) && !fs.existsSync(path.join(x.dir, "ReadMe.pdf"))) {
            reporter(`No ReadMe.txt or ReadMe.pdf found in ${x.dir}`, ReportLevel.Minor);
        }
        if (!fs.existsSync(path.join(x.dir, `${x.model}_cc.bat`)) && !fs.existsSync(path.join(x.dir, `${x.model}_cc.sh`))) {
            reporter(`No shell script (.bat or .sh) found in ${x.dir}`, ReportLevel.Minor);
        }
    }
}
