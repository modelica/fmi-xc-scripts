/**
 * This file contains various utility functions shared by other packages.
 */

import {
    parseVersion, parseVariant, parsePlatform, CrossCheckTable, CrossCheckResult, CrossCheckStatus,
} from '@modelica/fmi-data';

import { Reporter, ReportLevel } from './report';
import { ExportDetails } from './exports';
import { ImportDetails } from './imports';

import * as fs from 'fs';
import * as path from 'path';
var find = require('findit');

import * as debug from 'debug';
const utilDebug = debug('fmi:utils');

/**
 * This function finds all files with the given sufficx in the specified directory.
 * 
 * @param dir Directory to search
 */
export function findFilesWithSuffix(dir: string, suffix: string): string[] {
    let contents = fs.readdirSync(dir);
    return contents.filter((name) => name.endsWith(suffix));
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

/**
 * Create a CrossCheckTable where the local tools are the importers.
 * 
 * @param imports All import related data for the local tools
 * @param reporter 
 */
export function buildCrossCheckTable(imports: ImportDetails[], vendorId: string, reporter: Reporter): CrossCheckTable {
    // Loop over all imports
    utilDebug("Building cross-check result table");

    let table: CrossCheckTable = [];
    imports.forEach((imp): void => {
        let version = parseVersion(imp.fmi_version);
        let variant = parseVariant(imp.variant);
        let platform = parsePlatform(imp.platform);
        if (version == null) {
            reporter("Unknown version " + imp.fmi_version + " found in " + imp.dir + ", skipping", ReportLevel.Major);
            return;
        }
        if (variant == null) {
            reporter("Unknown variant " + imp.variant + " found in " + imp.dir + ", skipping", ReportLevel.Major);
            return;
        }
        if (platform == null) {
            reporter("Unknown version " + imp.platform + " found in " + imp.dir + ", skipping", ReportLevel.Major);
            return;
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
        table.push(ret);
    });
    return table;
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

export interface DirectoryDetails {
    dir: string;
    rel: string;
    parts: string[];
}

export function getDirectories(root: string): Promise<DirectoryDetails[]> {
    if (cachedDirectories.hasOwnProperty(root)) return Promise.resolve(cachedDirectories[root]);
    return new Promise((resolve, reject) => {
        let finder = find(root, {});
        let ret: DirectoryDetails[] = [];

        // Handle each directory
        finder.on('directory', (dir: string) => {
            // Identify relative path and then split it into components
            let rel = path.relative(root, dir);
            let parts = rel.split("/");

            ret.push({ dir: dir, rel: rel, parts: parts });
        })

        // Reject the promise if there is an error traversing the directory structure
        finder.on('error', (err: string) => {
            reject(err);
        })

        // Resolve the promise once we have complete traversing the directory structure
        finder.on('end', () => {
            cachedDirectories[root] = ret;
            resolve(ret);
        })
    })
}

const cachedDirectories: { [dir: string]: DirectoryDetails[] } = {};
