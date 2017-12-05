var find = require('findit');
var path = require('path');
import { ExportDetails, Predicate } from './exports';

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
export function getImports(root: string, pred?: Predicate<ImportDetails>): Promise<ImportDetails[]> {
    let predicate: Predicate<ImportDetails> = pred || (() => true);
    return new Promise((resolve, reject) => {
        let finder = find(root, {});
        let ret: ImportDetails[] = [];

        // Handle each directory
        finder.on('directory', (dir: string) => {
            // Identify relative path and then split it into components
            let rel = path.relative(root, dir);
            let parts = rel.split("/");

            // If the path has 8 parts, assume this directory is corresponds to
            // an imported FMUs
            if (parts.length == 8) {
                let details = parseImport(dir, rel, parts);
                if (predicate(details)) {
                    ret.push(details);
                }
            }
        })

        // Reject the promise if there is an error traversing the directory structure
        finder.on('error', (err: string) => {
            reject(err);
        })

        // Resolve the promise once we have complete traversing the directory structure
        finder.on('end', () => {
            resolve(ret);
        })
    })
}
