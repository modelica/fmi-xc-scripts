import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from '@modelica/fmi-data';
import { Database } from './db';
import * as fs from 'fs-extra';
import * as path from 'path';

import * as debug from 'debug';
const fileDebug = debug('fmi:db');
// fileDebug.enabled = true;

export class FileSystemDatabase implements Database {
    async loadTools(artifacts: string): Promise<ToolsTable> {
        try {
            fileDebug("Loading tools from file");
            return await fs.readJSON(path.join(artifacts, "tools.json"));
        } catch (e) {
            return [];
        }
    }

    async pushTools(toolMap: Map<string, ToolSummary>, _locals: string[], artifacts: string): Promise<void> {
        let table: ToolsTable = Array.from(toolMap.values());
        fileDebug("Pushing data about %d tools: ", table.length);

        fs.mkdirpSync(artifacts);
        let artifactsDir = path.join(artifacts, "tools.json");
        fs.writeFileSync(artifactsDir, JSON.stringify(table, null, 4));
        fileDebug("  Artifacts file for tools written to: %s", artifactsDir);
    }

    async pushFMUs(fmus: FMUTable, _local: string[], artifacts: string): Promise<void> {
        fileDebug("Pushing data about %d FMUs: ", fmus.length);

        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));
    }

    async  pushCrossChecks(xc: CrossCheckTable, _local: string[], artifacts: string): Promise<void> {
        fileDebug("Pushing data about %d cross check results: ", xc.length);

        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));
    }
}
