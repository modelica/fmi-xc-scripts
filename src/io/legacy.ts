import { LegacyToolFile, ToolSummary, Status, VendorDetails, ToolFile, VariantSupportFields } from '@modelica/fmi-data';
import { Reporter, ReportLevel } from '../core';
import * as fs from 'fs';
import * as ini from 'ini';
import * as debug from 'debug';
import * as path from 'path';

const legacyDebug = debug("fmi:legacy");

/**
 * This list of required fields in the ".info" files.
 */
const requiredFields = ["name", "href",
    // "import_me", "export_me", "slave_cs", "master_cs",
    // "import_me_20", "export_me_20", "slave_cs_20", "master_cs_20",
    // "email"
];

export function parseLegacyToolFile(filename: string): LegacyToolFile {
    let contents = fs.readFileSync(filename, 'utf-8');
    let obj = ini.parse(contents);
    legacyDebug("Legacy .info file %s contains: %j", filename, obj);
    return obj as LegacyToolFile;
}

/**
 * Build ToolSummary data from information contained in the legacy .info file
 * 
 * @param filename .info file to read
 * @param vendorId Id for vendor being processed
 */
export function readLegacyToolFileAsSummary(filename: string, reporter: Reporter): ToolSummary {
    let contents = fs.readFileSync(filename, 'utf-8');
    let obj: LegacyToolFile = ini.parse(contents);
    legacyDebug("Legacy .info file %s contains: %j", filename, obj);

    let basename = path.basename(filename);
    if (!basename.endsWith(".info")) throw new Error("Expected tool information to be contained in a file with the .info suffix");

    let toolId = path.basename(filename, ".info");

    if (!obj.hasOwnProperty("Tool")) throw new Error("No 'Tool' section found in " + filename);

    requiredFields.forEach((field) => {
        if (!obj.hasOwnProperty(field)) throw new Error("Required field '" + field + "' not found in " + filename);
    });

    return {
        id: toolId,
        displayName: obj.Tool.name,
        homepage: obj.Tool.href || "",
        email: obj.Tool.email || "",
        note: obj.Tool.note || "",
        fmi1: {
            import: parseStatus("import_me", obj.Tool, reporter),
            export: parseStatus("export_me", obj.Tool, reporter),
            slave: parseStatus("slave_cs", obj.Tool, reporter),
            master: parseStatus("master_cs", obj.Tool, reporter),
        },
        fmi2: {
            import: parseStatus("import_me_20", obj.Tool, reporter),
            export: parseStatus("export_me_20", obj.Tool, reporter),
            slave: parseStatus("slave_cs_20", obj.Tool, reporter),
            master: parseStatus("master_cs_20", obj.Tool, reporter),
        },
        vendorId: obj.Tool.vendor,
    }
}

export function upgradeToolData(vendor: VendorDetails, tool: LegacyToolFile): ToolFile {
    let fmi1: VariantSupportFields = {};
    let fmi2: VariantSupportFields = {};

    if (tool.Tool.import_me) fmi1.import = tool.Tool.import_me;
    if (tool.Tool.export_me) fmi1.import = tool.Tool.export_me;
    if (tool.Tool.slave_cs) fmi1.import = tool.Tool.slave_cs;
    if (tool.Tool.master_cs) fmi1.import = tool.Tool.master_cs;

    if (tool.Tool.import_me_20) fmi2.import = tool.Tool.import_me;
    if (tool.Tool.export_me_20) fmi2.import = tool.Tool.export_me;
    if (tool.Tool.slave_cs_20) fmi2.import = tool.Tool.slave_cs;
    if (tool.Tool.master_cs_20) fmi2.import = tool.Tool.master_cs;
    return {
        displayName: tool.Tool.name,
        homepage: tool.Tool.href,
        note: tool.Tool.note,
        email: tool.Tool.email,
        FMI1_0: fmi1,
        FMI2_0: fmi2,
        vendorId: vendor.vendorId,
    }
}

function parseStatus(field: string, obj: { [key: string]: string }, reporter: Reporter): Status {
    if (!obj.hasOwnProperty(field)) {
        return Status.Unsupported;
    }
    let str = obj[field];
    if (str == "A") {
        return Status.Available;
    }
    if (str == "") {
        return Status.Unsupported;
    }
    if (str == "P") {
        return Status.Planned;
    }

    reporter("Unexpected status for '" + field + "': '" + str + "'", ReportLevel.Minor);

    return Status.Unsupported;
}
