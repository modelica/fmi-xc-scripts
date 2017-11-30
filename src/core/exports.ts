var find = require('findit');
var path = require('path');

export const SVN = "/Users/mtiller/Source/ModelicaAssociation/public";
export const FMUs = path.join(SVN, "Test_FMUs");

export type Predicate<T> = (x: T) => boolean;

export interface ExportDetails {
    dir: string;
    rel: string;
    fmi: string;
    variant: string;
    platform: string;
    export_tool: string;
    export_version: string;
    model: string;
}

function parseExport(dir: string, rel: string, parts: string[]): ExportDetails {
    return {
        dir: dir,
        rel: rel,
        fmi: parts[0],
        variant: parts[1],
        platform: parts[2],
        export_tool: parts[3],
        export_version: parts[4],
        model: parts[5],
    };
}

export function getExports(root: string, pred?: Predicate<ExportDetails>): Promise<ExportDetails[]> {
    let predicate: Predicate<ExportDetails> = pred || (() => true);
    return new Promise((resolve, reject) => {
        let finder = find(root, {});
        let ret: ExportDetails[] = [];

        finder.on('directory', (dir: string) => {
            let rel = path.relative(root, dir);
            let parts = rel.split("/");
            if (parts.length == 6) {
                let details = parseExport(dir, rel, parts);
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
