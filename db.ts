import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from './schemas';
import * as fs from 'fs';

export async function loadTools(): Promise<ToolsTable> {
    return [];
}

export async function pushTools(toolMap: Map<string, ToolSummary>): Promise<void> {
    let table: ToolsTable = Array.from(toolMap.values());
    fs.writeFileSync("./tools.json", JSON.stringify(table, null, 4));
    //console.log(JSON.stringify(table));
    return;
}

export async function pushFMUs(fmus: FMUTable): Promise<void> {
    fs.writeFileSync("./fmus.json", JSON.stringify(fmus, null, 4));
    return;
}

export async function pushCrossChecks(xc: CrossCheckTable): Promise<void> {
    fs.writeFileSync("./xc_results.json", JSON.stringify(xc, null, 4));
    return;
}