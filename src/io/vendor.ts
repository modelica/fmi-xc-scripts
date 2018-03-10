import { VendorDetails, LegacyToolFile } from "@modelica/fmi-data";
import { findFilesWithSuffix } from "../core";
import * as ini from "ini";
import * as path from "path";
import * as fs from "fs";

import * as debug from "debug";
const vendorDebug = debug("fmi:io:vendor");

function readProp<T>(obj: any, prop: string, def?: string | T): string | T {
    if (obj.hasOwnProperty(prop)) return obj[prop] as string;
    if (def === undefined) throw new Error("No property '" + prop + "' found in: " + JSON.stringify(obj));
    return def;
}

export function loadVendorData(dir: string): VendorDetails {
    let vendorFiles = findFilesWithSuffix(dir, ".vendor");
    if (vendorFiles.length == 0) {
        throw new Error("No .vendor file found in " + dir);
    }
    if (vendorFiles.length > 1) {
        throw new Error("Multiple .vendor files found in " + dir + ": " + vendorFiles.join(", "));
    }
    let vendorFile = path.join(dir, vendorFiles[0]);
    let contents = fs.readFileSync(vendorFile, "utf-8");
    let obj = ini.parse(contents);
    vendorDebug("Vendor object: %j", obj);

    return {
        vendorId: readProp(obj, "vendorId"),
        displayName: readProp(obj, "displayName"),
        href: readProp(obj, "href", null),
        email: readProp(obj, "email", null),
        repo: readProp(obj, "repo"),
    };
}

export function createVendorDataFromLegacyToolFile(root: string, file: string): VendorDetails {
    vendorDebug("Reading info for %s", file);
    let contents = fs.readFileSync(path.join(root, "tools", file), "utf-8");
    let obj: LegacyToolFile = ini.parse(contents);
    vendorDebug("  INI contents: %j", obj);
    let vendor = obj.Tool.vendor;
    vendorDebug("  Vendor ID: %s", vendor);

    let repo = `git@github.com:fmi-xc/${vendor}`;
    vendorDebug("  Repository: %s", repo);

    return {
        vendorId: vendor,
        displayName: vendor,
        href: obj.Tool.href || null,
        email: obj.Tool.email || null,
        repo: repo,
    };
}
