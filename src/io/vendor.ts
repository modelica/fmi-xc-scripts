import { VendorDetails, LegacyToolFile } from '@modelica/fmi-data';
import * as ini from 'ini';
import * as path from 'path';
import * as fs from 'fs';

import * as debug from 'debug';
const vendorDebug = debug('fmi:io:vendor');

function readProp(obj: any, prop: string, def?: string): string {
    if (obj.hasOwnProperty(prop)) return obj[prop] as string;
    if (def == undefined) throw new Error("No property '" + prop + "' found in: " + JSON.stringify(obj));
    return def;
}

export function loadVendorData(dir: string): VendorDetails {
    let inifile = path.join(dir, "vendor.ini")
    let contents = fs.readFileSync(inifile, 'utf-8');
    let obj = ini.parse(contents);
    vendorDebug("Vendor object: %j", obj);

    return {
        vendorId: readProp(obj, "vendorId"),
        displayName: readProp(obj, "displayName"),
        href: readProp(obj, "href"),
        email: readProp(obj, "email"),
        repo: readProp(obj, "repo"),
    }
}

export function createVendorDataFromLegacyToolFile(root: string, file: string): VendorDetails {
    vendorDebug("Reading info for %s", file);
    let contents = fs.readFileSync(path.join(root, "tools", file), 'utf-8');
    let obj: LegacyToolFile = ini.parse(contents);
    vendorDebug("  INI contents: %j", obj);
    let vendor = obj.Tool.vendor;
    vendorDebug("  Vendor ID: %s", vendor);

    let repo = `git@github.com:fmi-xc/${vendor}`
    vendorDebug("  Repository: %s", repo);

    return {
        vendorId: vendor,
        displayName: vendor,
        href: obj.Tool.href,
        email: obj.Tool.email,
        repo: repo,
    };
}

