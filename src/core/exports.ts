import { getDirectories } from './utils';
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
