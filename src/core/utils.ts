/**
 * This file contains various utility functions shared by other packages.
 */
var ini = require('ini');

import {
    ToolSummary, VariantSupport, Status, parseVersion, parseVariant, parsePlatform,
    CrossCheckTable, CrossCheckResult, CrossCheckStatus,
} from '@modelica/fmi-data';

import { ExportDetails } from './exports';
import { ImportDetails } from './imports';

import * as fs from 'fs';
import * as path from 'path';

import * as debug from 'debug';
const utilDebug = debug('utils');

/**
 * Establishes a "level" for flagging concerns while processing.
 */
export enum ReportLevel {
    Minor = 0,
    Major = 1,
    Fatal = 2,
}

/**
 * Defines the type for callbacks used to report issues.
 */
export type Reporter = (x: string, level: ReportLevel) => void;

/**
 * This function finds all info files in the specified directory.
 * 
 * @param dir Directory to search
 */
export function infoFiles(dir: string): string[] {
    let contents = fs.readdirSync(dir);
    return contents.filter((name) => name.endsWith("info"));
}

/**
 * This list of required fields in the ".info" files.
 */
const requiredFields = ["name", "href",
    // "import_me", "export_me", "slave_cs", "master_cs",
    // "import_me_20", "export_me_20", "slave_cs_20", "master_cs_20",
    // "email"
];

function parseStatus(field: string, obj: { [key: string]: string }): VariantSupport {
    if (!obj.hasOwnProperty(field)) {
        return {
            status: Status.Unsupported,
            num: 0,
            platforms: {},
        }
    }
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
    if (str == "P") {
        return {
            status: Status.Planned,
            num: 0,
            platforms: {},
        }
    }
    console.warn("Unexpected status for '" + field + "': '" + str + "'");
    return {
        status: Status.Unsupported,
        num: 0,
        platforms: {},
    }
}

/**
 * Build ToolSummary data from information contained in the .info file
 * 
 * @param filename .info file to read
 * @param vendorId Id for vendor being processed
 */
export function parseInfo(filename: string, vendorId: string): ToolSummary {
    let contents = fs.readFileSync(filename, 'utf-8');
    let obj = ini.parse(contents);

    let basename = path.basename(filename);
    if (!basename.endsWith(".info")) throw new Error("Expected tool information to be contained in a file with the .info suffix");

    let toolId = basename.slice(0, basename.length - 5);

    if (!obj.hasOwnProperty("Tool")) throw new Error("No 'Tool' section found in " + filename);
    obj = obj["Tool"];

    requiredFields.forEach((field) => {
        if (!obj.hasOwnProperty(field)) throw new Error("Required field '" + field + "' not found in " + filename);
    });

    return {
        id: toolId,
        displayName: obj["name"],
        homepage: obj["href"] || "",
        email: obj["email"] || "",
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
        vendorId: vendorId,
    }
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
        let reporter = (x: string, level: ReportLevel) => {
            if (level > ReportLevel.Major) count++;
            report(x, level);
        }
        validate(elem, reporter);
        if (count == 0) ret.push(elem);
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

/**
 * Returns a function that validates import details.
 * 
 * @param local List of tools local to the repository currently being processed.
 * @param tools List of all tools
 */
export function validateImport(local: string[], tools: string[]) {
    return (x: ImportDetails, reporter: Reporter): void => {
        let idx = local.indexOf(x.import_tool);
        if (idx == -1) {
            let names = local.join(", ");
            reporter(`Import tool '${x.import_tool}' is not among list of tools defined in this repo: ${names}`, ReportLevel.Major);
        }
        idx = tools.indexOf(x.export_tool);
        if (idx == -1) {
            reporter(`Export tool '${x.export_tool}' is not among the list of known FMI tools`, ReportLevel.Major);
        }
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
}

/**
 * Create a CrossCheckTable where the local tools are the importers.
 * 
 * @param imports All import related data for the local tools
 * @param reporter 
 */
export function buildTable(imports: ImportDetails[], vendorId: string, reporter: Reporter): CrossCheckTable {
    // Loop over all imports
    utilDebug("Building cross-check result table");
    return imports.map((imp): CrossCheckResult => {
        let version = parseVersion(imp.fmi_version); // TODO: change to ex.version
        let variant = parseVariant(imp.variant);
        let platform = parsePlatform(imp.platform);
        if (version == null || variant == null || platform == null) {
            throw new Error("Unacceptable value found in previously validated data, this should not happen");
        }
        let status = parseResult(imp.dir, reporter);
        let ret: CrossCheckResult = {
            version: version,
            variant: variant,
            platform: platform,
            vendorId: vendorId,
            import_tool: imp.import_tool,
            import_version: imp.import_version,
            export_tool: imp.export_tool,
            export_version: imp.export_version,
            model: imp.model,
            status: status,
        }
        return ret;
    });
}

/**
 * Transform file system data into a CrossCheckStatus enum
 * @param dir 
 * @param reporter 
 */
function parseResult(dir: string, reporter: Reporter): CrossCheckStatus {
    if (fs.existsSync(path.join(dir, "passed"))) return "passed";
    if (fs.existsSync(path.join(dir, "failed"))) return "failed";
    if (fs.existsSync(path.join(dir, "rejected"))) return "rejected";
    reporter(`No result file name 'passed', 'failed' or 'rejected' found in ${dir}`, ReportLevel.Minor);
    return "failed";
}

/**
 * Yields a reporter that doesn't repeat itself
 * 
 * @export
 * @returns 
 */
export function reporter(min: ReportLevel) {
    let reported = new Set<string>();
    let numErrors = 0;
    let reporter: Reporter = (msg: string, level: ReportLevel) => {
        if (reported.has(msg)) return;
        if (level >= min) {
            reported.add(msg);
            if (level >= ReportLevel.Fatal) {
                console.error("ERROR: " + msg);
            } else {
                console.warn("WARNING: " + msg);
            }
        }
        if (level >= ReportLevel.Fatal) {
            numErrors++;
        }
    }
    return {
        reporter: reporter,
        numErrors: () => numErrors,
    }
}
