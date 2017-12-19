import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from '@modelica/fmi-data';
import { Database } from './db';
import * as fs from 'fs-extra';
import * as path from 'path';

import * as debug from 'debug';
const fileDebug = debug('fmi:db');

/**
 * An implementation of the Database interface that uses JSON files
 * on the file system as the means to achieve persistence.  This is
 * really note used in any serious way except for testing.
 */
export class FileSystemDatabase implements Database {
    async loadTools(artifacts: string | null): Promise<ToolsTable> {
        try {
            fileDebug("Loading tools from file");
            if (artifacts) {
                let toolsfile = path.join(artifacts, "tools.json");
                fileDebug("Loading existing tools from artifact directory: %s", toolsfile);
                return await fs.readJSON(toolsfile);
            } else {
                fileDebug("No artifacts directory specified, assuming no pre-existing data on tools to load");
                return [];
            }
        } catch (e) {
            return [];
        }
    }

    async pushTools(toolMap: Map<string, ToolSummary>, _locals: string[], artifacts: string | null): Promise<void> {
        let table: ToolsTable = Array.from(toolMap.values());
        fileDebug("Pushing data about %d tools: ", table.length);

        if (artifacts) {
            fs.mkdirpSync(artifacts);
            let artifactsDir = path.join(artifacts, "tools.json");
            fs.writeFileSync(artifactsDir, JSON.stringify(table, null, 4));
            fileDebug("  Artifacts file for tools written to: %s", artifactsDir);
        } else {
            fileDebug("  No artifacts directory specified, cannot write tools.json");
        }
    }

    async pushFMUs(fmus: FMUTable, _local: string[], artifacts: string | null): Promise<void> {
        fileDebug("Pushing data about %d FMUs: ", fmus.length);

        if (artifacts) {
            fileDebug("  Writing fmus.json file in %s", artifacts);
            fs.mkdirpSync(artifacts);
            fs.writeFileSync(path.join(artifacts, "fmus.json"), JSON.stringify(fmus, null, 4));
        } else {
            fileDebug("  No artifacts directory specified, cannot write fmus.json");
        }
    }

    async  pushCrossChecks(xc: CrossCheckTable, _local: string[], artifacts: string | null): Promise<void> {
        fileDebug("Pushing data about %d cross check results: ", xc.length);

        if (artifacts) {
            fileDebug("  Writing xc_results.json in %s", artifacts);
            fs.mkdirpSync(artifacts);
            fs.writeFileSync(path.join(artifacts, "xc_results.json"), JSON.stringify(xc, null, 4));
        } else {
            fileDebug("  No artifacts directory specified, cannot write xc_results.json");
        }
    }
}
