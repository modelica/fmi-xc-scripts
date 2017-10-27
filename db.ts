import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from './schemas';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as mongodb from 'mongodb';

import * as debug from 'debug';
const mongoDebug = debug('fmi:db');
//mongoDebug.enabled = true;

export async function loadTools(): Promise<ToolsTable> {
    mongoDebug("Loading tools from Mongo");
    let db = await mongoConnect();
    if (!db) {
        mongoDebug("  Unable to connect");
        console.warn("Unable to connect to database");
        return [];
    }
    let col = db.collection<ToolSummary>("tools");
    let tools = await col.find({});
    let ret = await tools.toArray();
    mongoDebug("  Found %d tools", ret.length);
    await db.close();
    return ret;
}

async function mongoConnect(): Promise<mongodb.Db | null> {
    let url = process.env["MONGO_XC"];
    mongoDebug("  MONGO_XC = %s", url);
    if (!url) return null;

    return await mongodb.MongoClient.connect(url);
}

export async function pushTools(toolMap: Map<string, ToolSummary>, locals: string[], artifacts: string): Promise<void> {
    let table: ToolsTable = Array.from(toolMap.values());
    mongoDebug("Pushing data about %d tools: ", table.length);

    fs.mkdirpSync(artifacts);
    let artifactsDir = path.join(artifacts, "tools.json");
    fs.writeFileSync(artifactsDir, JSON.stringify(table, null, 4));
    mongoDebug("  Artifacts file for tools written to: %s", artifactsDir);

    let db = await mongoConnect();
    if (!db) {
        mongoDebug("  Unable to write to MongoDB");
        return;
    }
    let col = db.collection<ToolSummary>("tools");

    // Write to Mongo
    //let keys = Array.from(toolMap.keys());
    for (let key of locals) {
        let summary = toolMap.get(key);
        if (summary == null) continue;
        let result = await col.updateOne({ _id: summary.id },
            { _id: summary.id, ...summary }, { upsert: true });
        if (result.matchedCount + result.upsertedCount != 1) {
            console.log(result);
            console.warn(`Number of modified documents modified for tool ${summary.id} was ${result.modifiedCount}`);
        }
        mongoDebug("  Wrote data for tool %s", key);
    }
    await db.close();
}

interface FMUDocument {
    name: string;
    version: string;
    variant: string;
    platform: string;
    export_tool: string;
    export_version: string;
}

export async function pushFMUs(fmus: FMUTable, artifacts: string): Promise<void> {
    mongoDebug("Pushing data about %d FMUs: ", fmus.length);

    fs.mkdirpSync(artifacts);
    fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));

    let db = await mongoConnect();
    if (!db) return;
    let col = db.collection<FMUDocument>("fmus");

    // TODO: Remove all records related to the tools being processed

    // Write to Mongo
    for (let i = 0; i < fmus.length; i++) {
        let fmu = fmus[i];
        let doc: FMUDocument = {
            name: fmu.name,
            version: fmu.version,
            variant: fmu.variant,
            platform: fmu.platform,
            export_tool: fmu.exporter.tool,
            export_version: fmu.exporter.version,
        }
        try {
            let result = await col.updateOne(doc, doc, { upsert: true });
            if (result.matchedCount + result.upsertedCount != 1) {
                let entry = JSON.stringify(fmu);
                console.warn(`Number of modified documents modified for FMU '${entry}' was ${result.modifiedCount}`);
            }
        } catch (e) {
            let entry = JSON.stringify(fmu);
            console.error("Error while writing FMU: " + entry + ": ", e.message);
        }
    }
    mongoDebug("  All FMUs pushed to Mongo");
    await db.close();
    return;
}

interface CrossCheckDocument {
    version: string;
    variant: string;
    platform: string;
    export_tool: string;
    export_version: string;
    import_tool: string;
    import_version: string;
    model: string;
    status: string;
}

export async function pushCrossChecks(xc: CrossCheckTable, artifacts: string): Promise<void> {
    mongoDebug("Pushing data about %d cross check results: ", xc.length);

    fs.mkdirpSync(artifacts);
    fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));

    let db = await mongoConnect();
    if (!db) return;
    let col = db.collection<CrossCheckDocument>("cross-check");

    // TODO: Remove all records related to the tools being processed

    // Write to Mongo
    for (let i = 0; i < xc.length; i++) {
        let result = xc[i];
        let doc: CrossCheckDocument = {
            version: result.version,
            variant: result.variant,
            platform: result.platform,
            export_tool: result.exporter.tool,
            export_version: result.exporter.version,
            import_tool: result.importer.tool,
            import_version: result.importer.version,
            model: result.model,
            status: result.status,
        }
        try {
            let result = await col.updateOne(doc, doc, { upsert: true });
            if (result.matchedCount + result.upsertedCount != 1) {
                let entry = JSON.stringify(result);
                console.warn(`Number of modified documents modified for FMU '${entry}' was ${result.modifiedCount}`);
            }
        } catch (e) {
            let entry = JSON.stringify(result);
            console.error("Error while writing FMU: " + entry + ": ", e.message);
        }
    }
    mongoDebug("  All cross check results pushed to Mongo");
    await db.close();
    return;
}