var find = require('findit');
var path = require('path');
import { ExportDetails, SVN, Predicate } from './exports';
import { ToolDetails } from '@modelica/fmi-data';

export const CrossChecks = path.join(SVN, "CrossCheck_Results");

export interface ImportDetails extends ExportDetails {
    importer: ToolDetails;
}

function parseImport(dir: string, rel: string, parts: string[]): ImportDetails {
    return {
        dir: dir,
        rel: rel,
        fmi: parts[0],
        variant: parts[1],
        platform: parts[2],
        importer: {
            tool: parts[3],
            version: parts[4],
        },
        exporter: {
            tool: parts[5],
            version: parts[6],
        },
        model: parts[7],
    };
}

export function getImports(root: string, pred?: Predicate<ImportDetails>): Promise<ImportDetails[]> {
    let predicate: Predicate<ImportDetails> = pred || (() => true);
    return new Promise((resolve, reject) => {
        let finder = find(root, {});
        let ret: ImportDetails[] = [];

        finder.on('directory', (dir: string) => {
            let rel = path.relative(root, dir);
            let parts = rel.split("/");

            if (parts.length == 8) {
                let details = parseImport(dir, rel, parts);
                if (predicate(details)) {
                    ret.push(details);
                }
            }
        })
        finder.on('error', (err: string) => {
            reject(err);
        })
        finder.on('end', () => {
            resolve(ret);
        })
    })
}
