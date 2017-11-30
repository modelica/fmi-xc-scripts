import { ToolsTable, ToolSummary, FMUTable, FMUDetails, CrossCheckTable, CrossCheckResult } from '@modelica/fmi-data';
import { Database } from './db';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as mongodb from 'mongodb';

import * as debug from 'debug';
const mongoDebug = debug('fmi:db');
// mongoDebug.enabled = true;

async function mongoConnect(): Promise<mongodb.Db | null> {
    let url = process.env["MONGO_XC"];
    mongoDebug("  MONGO_XC = %s", url);
    if (!url) return null;

    return await mongodb.MongoClient.connect(url);
}

export class MongoDatabase implements Database {

    async loadTools(_artifacts: string): Promise<ToolsTable> {
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

    async pushTools(toolMap: Map<string, ToolSummary>, locals: string[], artifacts: string): Promise<void> {
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

        try {
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
        } catch (e) {
            console.error(e);
        } finally {
            await db.close();
        }
    }

    async pushFMUs(fmus: FMUTable, local: string[], artifacts: string): Promise<void> {
        mongoDebug("Pushing data about %d FMUs: ", fmus.length);

        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));

        let db = await mongoConnect();
        if (!db) return;
        try {
            let col = db.collection<FMUDetails>("fmus");

            // Remove all records related to the tools being processed
            await Promise.all(local.map((tool) => col.deleteMany({ export_tool: tool })));

            let docs = fmus.map((fmu) => {
                return {
                    name: fmu.name,
                    version: fmu.version,
                    variant: fmu.variant,
                    platform: fmu.platform,
                    export_tool: fmu.export_tool,
                    export_version: fmu.export_version,
                }
            });

            // Write to Mongo
            if (docs.length > 0) {
                let result = await col.insertMany(docs);
                if (result.insertedCount != docs.length) {
                    console.warn(`Expected ${docs.length} cross-check results to be inserted, but only ${result.insertedCount} were actually inserted`);
                }
            }
            mongoDebug("  All FMUs pushed to Mongo");
        } catch (e) {
            console.error(e);
        } finally {
            await db.close();
        }
        return;
    }

    async pushCrossChecks(xc: CrossCheckTable, local: string[], artifacts: string): Promise<void> {
        mongoDebug("Pushing data about %d cross check results: ", xc.length);

        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));

        let db = await mongoConnect();
        if (!db) return;

        try {
            let col = db.collection<CrossCheckResult>("cross-check");

            // Remove all records related to the tools being processed
            await Promise.all(local.map((tool) => col.deleteMany({ import_tool: tool })));

            // Create all cross check documents we have built
            let docs = xc.map((result): CrossCheckResult => {
                return {
                    version: result.version,
                    variant: result.variant,
                    platform: result.platform,
                    export_tool: result.export_tool,
                    export_version: result.export_version,
                    import_tool: result.import_tool,
                    import_version: result.import_version,
                    model: result.model,
                    status: result.status,
                }
            });

            // Write to Mongo
            if (docs.length > 0) {
                let result = await col.insertMany(docs);
                if (result.insertedCount != docs.length) {
                    console.warn(`Expected ${docs.length} cross-check results to be inserted, but only ${result.insertedCount} were actually inserted`);
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            await db.close();
        }
    }
}