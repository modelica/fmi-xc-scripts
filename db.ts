import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from './schemas';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as mongodb from 'mongodb';

export async function loadTools(): Promise<ToolsTable> {
    let db = await mongoConnect();
    if (!db) {
        console.warn("Unable to connect to database");
        return [];
    }
    let col = db.collection<ToolSummary>("tools");
    let tools = await col.find({});
    let ret = await tools.toArray();
    await db.close();
    return ret;
}

async function mongoConnect(): Promise<mongodb.Db | null> {
    let url = process.env["MONGO_XC"];
    if (!url) return null;

    return await mongodb.MongoClient.connect(url);
}

export async function pushTools(toolMap: Map<string, ToolSummary>, artifacts: string): Promise<void> {
    let table: ToolsTable = Array.from(toolMap.values());

    fs.mkdirpSync(artifacts);
    fs.writeFileSync(path.join(artifacts, "tools.json"), JSON.stringify(table, null, 4));

    let db = await mongoConnect();
    if (!db) return;
    let col = db.collection<ToolSummary>("tools");

    // Write to Mongo
    let keys = Array.from(toolMap.keys());
    for (let key of keys) {
        let summary = toolMap.get(key);
        if (summary == null) continue;
        let result = await col.updateOne({ _id: summary.id },
            { _id: summary.id, ...summary }, { upsert: true });
        if (result.matchedCount + result.upsertedCount != 1) {
            console.log(result);
            console.warn(`Number of modified documents modified for tool ${summary.id} was ${result.modifiedCount}`);
        }
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
    fs.mkdirpSync(artifacts);
    fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));

    let db = await mongoConnect();
    if (!db) return;
    let col = db.collection<FMUDocument>("fmus");

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
}

export async function pushCrossChecks(xc: CrossCheckTable, artifacts: string): Promise<void> {
    fs.mkdirpSync(artifacts);
    fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));

    let db = await mongoConnect();
    if (!db) return;
    let col = db.collection<CrossCheckDocument>("cross-check");

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
    await db.close();
    return;
}