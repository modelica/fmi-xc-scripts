import { LegacyToolFile, ToolFile, VariantSupportFields } from "@modelica/fmi-data";
import * as fs from "fs";
import * as ini from "ini";
import * as debug from "debug";

const legacyDebug = debug("fmi:legacy");

export function parseLegacyToolFile(filename: string): LegacyToolFile {
    let contents = fs.readFileSync(filename, "utf-8");
    let obj = ini.parse(contents);
    legacyDebug("Legacy .info file %s contains: %j", filename, obj);
    return obj as LegacyToolFile;
}

export function upgradeToolData(tool: LegacyToolFile): ToolFile {
    let fmi1: VariantSupportFields = {};
    let fmi2: VariantSupportFields = {};

    if (tool.Tool.import_me) fmi1.import = tool.Tool.import_me;
    if (tool.Tool.export_me) fmi1.export = tool.Tool.export_me;
    if (tool.Tool.slave_cs) fmi1.slave = tool.Tool.slave_cs;
    if (tool.Tool.master_cs) fmi1.master = tool.Tool.master_cs;

    if (tool.Tool.import_me_20) fmi2.import = tool.Tool.import_me;
    if (tool.Tool.export_me_20) fmi2.export = tool.Tool.export_me;
    if (tool.Tool.slave_cs_20) fmi2.slave = tool.Tool.slave_cs;
    if (tool.Tool.master_cs_20) fmi2.master = tool.Tool.master_cs;
    return {
        displayName: tool.Tool.name,
        homepage: tool.Tool.href || null,
        note: tool.Tool.note || "",
        email: tool.Tool.email || null,
        FMI1_0: fmi1,
        FMI2_0: fmi2,
    };
}
