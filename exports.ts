var find = require('findit');
var path = require('path');

export const SVN = "/Users/mtiller/Source/ModelicaAssociation/public";
export const FMUs = path.join(SVN, "Test_FMUs");

export type Predicate<T> = (x: T) => boolean;

export interface ToolDetails {
    tool: string;
    version: string;
}

export interface ExportDetails {
    dir: string;
    rel: string;
    fmi: string;
    variant: string;
    platform: string;
    exporter: ToolDetails;
    model: string;
}

function parseExport(root: string, dir: string, rel: string, parts: string[]): ExportDetails {
    return {
        dir: dir,
        rel: rel,
        fmi: parts[0],
        variant: parts[1],
        platform: parts[2],
        exporter: {
            tool: parts[3],
            version: parts[4],
        },
        model: parts[5],
    };
}

export function getExports(root: string, pred?: Predicate<ExportDetails>): Promise<ExportDetails[]> {
    let predicate: Predicate<ExportDetails> = pred || ((x: ExportDetails) => true);
    return new Promise((resolve, reject) => {
        let finder = find(root, {});
        let ret: ExportDetails[] = [];

        finder.on('directory', (dir: string) => {
            let rel = path.relative(root, dir);
            let parts = rel.split("/");
            if (parts.length == 6) {
                let details = parseExport(root, dir, rel, parts);
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
