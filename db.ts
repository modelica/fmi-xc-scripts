import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from './schemas';
import * as fs from 'fs';
import * as path from 'path';
import * as mongodb from 'mongodb';

export async function loadTools(): Promise<ToolsTable> {
    return [];
}

async function mongoConnect(): Promise<mongodb.Db | null> {
    let url = process.env["MONGO_XC"];
    if (!url) return null;

    return await mongodb.MongoClient.connect(url);
}

export async function pushTools(toolMap: Map<string, ToolSummary>, artifacts: string): Promise<void> {
    let table: ToolsTable = Array.from(toolMap.values());
    fs.writeFileSync(path.join(artifacts, "tools.json"), JSON.stringify(table, null, 4));

    let db = await mongoConnect();
    if (!db) return;
    let col = db.collection<ToolDocument>("tools");

    // Write to Mongo
    let keys = Array.from(toolMap.keys());
    for (let key of keys) {
        console.log("Writing ", key);
        let summary = toolMap.get(key);
        if (summary == null) continue;
        let result = await col.updateOne({ _id: summary.toolName },
            { _id: summary.toolName, ...summary }, { upsert: true });
        if (result.modifiedCount + result.upsertedCount != 1) {
            console.warn(`Number of modified documents modified for tool ${summary.toolName} was ${result.modifiedCount}`);
        }
    }
    await db.close();
}

interface ToolDocument {
    name: string;
    version: string;
    variant: string;
    platform: string;
    export_tool: string;
    export_version: string;
}

export async function pushFMUs(fmus: FMUTable, artifacts: string): Promise<void> {
    fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));
    let db = await mongoConnect();
    if (!db) return;
    let col = db.collection<ToolDocument>("fmus");

    // Write to Mongo
    for (let i = 0; i < fmus.length; i++) {
        let fmu = fmus[i];
        let doc: ToolDocument = {
            name: fmu.name,
            version: fmu.version,
            variant: fmu.variant,
            platform: fmu.platform,
            export_tool: fmu.exporter.tool,
            export_version: fmu.exporter.version,
        }
        try {
            let result = await col.updateOne(doc, doc, { upsert: true });
            if (result.modifiedCount + result.upsertedCount != 1) {
                let entry = JSON.stringify(fmu);
                console.warn(`Number of modified documents modified for FMU '${entry}' was ${result.modifiedCount}`);
            }
        } catch (e) {
            let entry = JSON.stringify(fmu);
            console.error("Error while writing FMU: " + entry + ": ", e.message);
        }
    }
    await db.close();
    return;
}

export async function pushCrossChecks(xc: CrossCheckTable, artifacts: string): Promise<void> {
    fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));
    return;
}