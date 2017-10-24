var find = require('findit');
var ini = require('ini');

import { ToolSummary, VariantSupport, Status } from './schemas';

import * as fs from 'fs';

export function infoFiles(dir: string): string[] {
    let contents = fs.readdirSync(dir);
    return contents.filter((name) => name.endsWith("info"));
}

export function findFiles(dir: string, predicate: (name: string) => boolean): Promise<string[]> {
    return new Promise((resolve, reject) => {
        let finder = find(dir, {});
        let ret: string[] = [];

        finder.on('file', (file: string) => {
            if (predicate(file)) {
                ret.push(file);
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

const requiredFields = ["name", "href", "import_me", "export_me", "slave_cs", "master_cs",
    "import_me_20", "export_me_20", "slave_cs_20", "master_cs_20", "email"];

function parseStatus(field: string, obj: { [key: string]: string }): VariantSupport {
    let str = obj[field];
    if (str == "A") {
        return {
            status: Status.Available,
            num: 0,
            platforms: {},
        }
    }
    if (str == "") {
        return {
            status: Status.Unsupported,
            num: 0,
            platforms: {},
        }
    }
    console.warn("Unspected status for '" + field + "': '" + str + "'");
    return {
        status: Status.Unsupported,
        num: 0,
        platforms: {},
    }
}
export function parseInfo(filename: string): ToolSummary {
    let contents = fs.readFileSync(filename, 'utf-8');
    console.log("contents = ", contents);
    let obj = ini.parse(contents);
    console.log(obj);

    if (!obj.hasOwnProperty("Tool")) throw new Error("No 'Tool' section found in " + filename);
    obj = obj["Tool"];

    requiredFields.forEach((field) => {
        if (!obj.hasOwnProperty(field)) throw new Error("Required field '" + field + "' not found in " + filename);
    });

    return {
        toolName: obj["name"],
        homepage: obj["href"],
        email: obj["email"],
        note: obj["note"] || "",
        fmi1: {
            import: parseStatus("import_me", obj),
            export: parseStatus("export_me", obj),
            slave: parseStatus("slave_cs", obj),
            master: parseStatus("master_cs", obj),
        },
        fmi2: {
            import: parseStatus("import_me_20", obj),
            export: parseStatus("export_me_20", obj),
            slave: parseStatus("slave_cs_20", obj),
            master: parseStatus("master_cs_20", obj),
        }
    }
}