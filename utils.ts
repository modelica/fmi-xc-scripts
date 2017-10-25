var find = require('findit');
var ini = require('ini');

import { ToolSummary, VariantSupport, Status, parseVersion, parseVariant, parsePlatform, CrossCheckResult, CrossCheckTable } from './schemas';
import { ExportDetails } from './exports';
import { ImportDetails } from './imports';

import * as fs from 'fs';
import * as path from 'path';

export type Reporter = (x: string) => void;

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

export function parseInfo(filename: string, repo: string): ToolSummary {
    let contents = fs.readFileSync(filename, 'utf-8');
    let obj = ini.parse(contents);

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
        },
        repo: repo,
    }
}

export function partition<T>(array: Array<T>, predicate: (x: T) => boolean): { in: Array<T>, out: Array<T> } {
    let ret: { in: Array<T>, out: Array<T> } = {
        in: [],
        out: [],
    }
    array.forEach((elem) => {
        if (predicate(elem)) ret.in.push(elem);
        else ret.out.push(elem);
    })
    return ret;
}

/**
 * This function validates an array of elements returning the set of valid elements.  The
 * validate function should return a message describing why an element is invalid if it finds
 * a problem, otherwise it should return null.  Any issues found will be concatenated to
 * the issues argument.
 * 
 * @export
 * @template T 
 * @param {Array<T>} array 
 * @param {((x: T) => string | null)} validate 
 * @param {string[]} issues 
 * @returns {Array<T>} 
 */
export function validate<T>(array: Array<T>, validate: (x: T, report: Reporter) => void, report: Reporter): Array<T> {
    let ret: Array<T> = [];
    array.forEach((elem) => {
        let count = 0;
        let reporter = (x: string) => {
            count++;
            report(x);
        }
        validate(elem, reporter);
        if (count == 0) ret.push(elem);
    })
    return ret;
}

// TODO: Write with report callback
export function validateExport(local: string[]) {
    return (x: ExportDetails, reporter: Reporter): void => {
        let idx = local.indexOf(x.exporter.tool);
        if (idx == -1) {
            let names = local.join(", ");
            reporter(`Tool '${x.exporter.tool}' is not among list of tools defined in this repo: ${names}`);
        }
        if (parseVersion(x.fmi) == null) reporter(`Unknown FMI version '${x.fmi}'`);
        if (parseVariant(x.variant) == null) reporter(`Unknown FMI variant '${x.variant}'`);
        if (parsePlatform(x.platform) == null) reporter(`Unknown FMI platform '${x.platform}'`);
        let requiredFiles = [
            '.fmu', '_ref.csv', '_in.csv', '_cc.log', '_cc.csv', '_ref.opt',
        ];
        // TODO: Check for Readme?
        // TODO: Check for batch
        for (let suffix of requiredFiles) {
            let fileName = `${x.model}${suffix}`
            if (!fs.existsSync(path.join(x.dir, fileName))) reporter(`Expected to find a file named ${fileName} in ${x.dir}`);
        }
        if (!fs.existsSync(path.join(x.dir, "ReadMe.txt")) && !fs.existsSync(path.join(x.dir, "ReadMe.pdf"))) {
            reporter(`No ReadMe.txt or ReadMe.pdf found in ${x.dir}`);
        }
        if (!fs.existsSync(path.join(x.dir, `${x.model}_cc.bat`)) && !fs.existsSync(path.join(x.dir, `${x.model}_cc.sh`))) {
            reporter(`No shell script (.bat or .sh) found in ${x.dir}`);
        }
    }
}

export function validateImport(local: string[], tools: string[]) {
    return (x: ImportDetails, reporter: Reporter): void => {
        let idx = local.indexOf(x.importer.tool);
        if (idx == -1) {
            let names = local.join(", ");
            reporter(`Import tool '${x.importer.tool}' is not among list of tools defined in this repo: ${names}`);
        }
        idx = tools.indexOf(x.exporter.tool);
        if (idx == -1) {
            reporter(`Export tool '${x.exporter.tool}' is not among the list of known FMI tools`);
        }
        if (parseVersion(x.fmi) == null) reporter(`Unknown FMI version '${x.fmi}'`);
        if (parseVariant(x.variant) == null) reporter(`Unknown FMI variant '${x.variant}'`);
        if (parsePlatform(x.platform) == null) reporter(`Unknown FMI platform '${x.platform}'`);
        let csvName = x.model + "_out.csv";
        if (!fs.existsSync(path.join(x.dir, csvName))) reporter(`No CSV file named ${csvName} found in ${x.dir}`);
        if (!fs.existsSync(path.join(x.dir, "ReadMe.txt")) && !fs.existsSync(path.join(x.dir, "ReadMe.pdf"))) {
            reporter(`No ReadMe.txt or ReadMe.pdf found in ${x.dir}`);
        }
    }
}

export function buildTable(imports: ImportDetails[], reporter: Reporter): CrossCheckTable {
    let ret: CrossCheckTable = [];
    imports.forEach((imp) => {
        let existing = ret.findIndex((summary) => summary.importer.tool == imp.importer.tool &&
            summary.importer.version == imp.importer.version && summary.exporter.tool == imp.exporter.tool &&
            summary.exporter.version == imp.exporter.version);

        let results = existing >= 0 ? ret[existing].results : {};

        results[imp.model] = status(imp.dir, reporter);

        if (existing == -1) {
            let version = parseVersion(imp.fmi); // TODO: change to ex.version
            let variant = parseVariant(imp.variant);
            let platform = parsePlatform(imp.platform);
            if (version == null || variant == null || platform == null) {
                throw new Error("Unacceptable value found in previously validated data, this should not happen");
            }
            ret.push({
                version: version,
                variant: variant,
                platform: platform,
                importer: imp.importer,
                exporter: imp.exporter,
                results: results,
            })
        } else {
            ret[existing].results = results;
        }
    })
    return ret;
}

function status(dir: string, reporter: Reporter): CrossCheckResult {
    if (fs.existsSync(path.join(dir, "passed"))) return CrossCheckResult.Passed;
    if (fs.existsSync(path.join(dir, "failed"))) return CrossCheckResult.Failed;
    if (fs.existsSync(path.join(dir, "rejected"))) return CrossCheckResult.Rejected;
    reporter(`No result file name 'passed', 'failed' or 'rejected' found in ${dir}`);
    return CrossCheckResult.Failed;
}