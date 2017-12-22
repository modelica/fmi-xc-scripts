import { ToolFile, Status, VariantStatus, VariantSupportFields, ToolSummary } from '@modelica/fmi-data';
import { Reporter, ReportLevel } from '../core';

import * as fs from 'fs';
import * as ini from 'ini';
import * as path from 'path';

import * as debug from 'debug';
const toolsDebug = debug('fmi:io:tools');

export function parseToolFile(filename: string): { id: string, tool: ToolFile } {
    let contents = fs.readFileSync(filename, 'utf-8');
    let obj = ini.parse(contents);
    toolsDebug("Tool file %s contains: %j", filename, obj);

    if (!obj.hasOwnProperty("FMI1_0")) obj.FMI1_0 = {};
    if (!obj.hasOwnProperty("FMI2_0")) obj.FMI2_0 = {};

    let id = path.basename(filename, ".tool");

    return {
        id: id,
        tool: obj as ToolFile,
    };
}

function parseStatus(x: string | undefined, reporter: Reporter): Status {
    if (x == "P") return Status.Planned;
    if (x == "A") return Status.Available;
    if (x == null || x == undefined || x == "") return Status.Unsupported;
    reporter("Unknown status string '" + x + "' found, ignoring", ReportLevel.Minor);
    return Status.Unsupported;
}

function parseSupportFields(fields: VariantSupportFields, reporter: Reporter): VariantStatus {
    return {
        export: parseStatus(fields.export, reporter),
        import: parseStatus(fields.import, reporter),
        slave: parseStatus(fields.slave, reporter),
        master: parseStatus(fields.master, reporter),
    }
}

export function buildToolSummaryFromToolFile(filename: string, reporter: Reporter): ToolSummary {
    let config = parseToolFile(filename);
    return {
        id: config.id,
        displayName: config.tool.displayName,
        homepage: config.tool.homepage,
        email: config.tool.email,
        note: config.tool.note,
        fmi1: parseSupportFields(config.tool.FMI1_0, reporter),
        fmi2: parseSupportFields(config.tool.FMI2_0, reporter),
        vendorId: config.tool.vendorId,
    }
}

export function writeToolFile(file: string, data: ToolFile) {
    let content = ini.stringify(data);
    fs.writeFileSync(file, content);
}

