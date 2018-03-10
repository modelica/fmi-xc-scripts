import {
    ToolsTable,
    ToolSummary,
    FMUTable,
    CrossCheckTable,
    FMUDetails,
    CrossCheckResult,
    VendorDetails,
} from "@modelica/fmi-data";
import { Database } from "./db";
import * as fs from "fs-extra";
import * as path from "path";

import * as debug from "debug";
const fileDebug = debug("fmi:db");

import { xcFile, fmusFile, toolsFile } from "./files";

function sort<T extends {}>(arr: T[]): void {
    arr.sort((a, b) => {
        let sa = JSON.stringify(a);
        let sb = JSON.stringify(b);
        return sa > sb ? 1 : sa < sb ? -1 : 0;
    });
}

function mergeDetails<T extends { vendor: VendorDetails }>(orig: T[], updating: T[], vendorId: string): T[] {
    for (let i = 0; i < updating.length; i++) {
        let entity = updating[i];
        if (entity.vendor.vendorId != vendorId) {
            console.error("Vendor: " + vendorId);
            console.error("Updates: " + JSON.stringify(updating));
            console.error("Entity: " + JSON.stringify(entity));
            throw new Error(
                `Found entity owned by ${entity.vendor.vendorId} while updating entities for vendor ${vendorId}`,
            );
        }
    }
    // Strip out all entities associated with this vendor
    let entities = [...orig].filter(entity => entity.vendor.vendorId != vendorId);
    return [...entities, ...updating];
}

function mergeId<T extends { vendorId: string }>(orig: T[], updating: T[], vendorId: string): T[] {
    for (let i = 0; i < updating.length; i++) {
        let entity = updating[i];
        if (entity.vendorId != vendorId) {
            console.error("Vendor: " + vendorId);
            console.error("Updates: " + JSON.stringify(updating));
            console.error("Entity: " + JSON.stringify(entity));
            throw new Error(`Found entity owned by ${entity.vendorId} while updating entities for vendor ${vendorId}`);
        }
    }
    // Strip out all entities associated with this vendor
    let entities = [...orig].filter(entity => entity.vendorId != vendorId);
    return [...entities, ...updating];
}

/**
 * An implementation of the Database interface that uses JSON files
 * on the file system as the means to achieve persistence.  This is
 * really note used in any serious way except for testing.
 */
export class FileSystemDatabase implements Database {
    private tools: ToolSummary[] = [];
    private fmus: FMUDetails[] = [];
    private xc: CrossCheckResult[] = [];
    constructor(protected artifactsDir: string) {}
    async open() {
        this.tools = await this.loadTools();
        this.fmus = await this.loadFMUs();
        this.xc = await this.loadXCs();
        return undefined;
    }
    private async loadTools(): Promise<ToolsTable> {
        let artifacts = this.artifactsDir;
        try {
            fileDebug("Loading tools from file");
            let toolsfile = path.join(artifacts, toolsFile);
            fileDebug("Loading existing tools from directory: %s", toolsfile);
            return await fs.readJSON(toolsfile);
        } catch (e) {
            return [];
        }
    }

    private async loadFMUs(): Promise<FMUDetails[]> {
        let artifacts = this.artifactsDir;
        try {
            fileDebug("Loading tools from file");
            let fmufile = path.join(artifacts, fmusFile);
            fileDebug("Loading existing FMUs from directory: %s", fmufile);
            return await fs.readJSON(fmufile);
        } catch (e) {
            return [];
        }
    }

    private async loadXCs(): Promise<CrossCheckResult[]> {
        let artifacts = this.artifactsDir;
        try {
            fileDebug("Loading tools from file");
            let fmufile = path.join(artifacts, xcFile);
            fileDebug("Loading existing Cross-Check results from directory: %s", fmufile);
            return await fs.readJSON(fmufile);
        } catch (e) {
            return [];
        }
    }

    async updateTools(updating: ToolSummary[], vendorId: string): Promise<void> {
        fileDebug("Updating data about %d tools: ", updating.length);
        this.tools = mergeDetails(this.tools, updating, vendorId);
    }

    async updateFMUs(updating: FMUTable, vendorId: string): Promise<void> {
        fileDebug("Pushing data about %d FMUs: ", updating.length);

        // TODO: Make sure these reference only known tools

        this.fmus = mergeId(this.fmus, updating, vendorId);
    }

    async updateCrossChecks(updating: CrossCheckTable, vendorId: string): Promise<void> {
        fileDebug("Pushing data about %d cross check results: ", updating.length);

        // TODO: Make sure these reference only known tools

        this.xc = mergeId(this.xc, updating, vendorId);
    }

    async removeVendor(id: string): Promise<void> {
        this.tools = this.tools.filter(tool => tool.vendor.vendorId === id);
        this.fmus = this.fmus.filter(fmu => fmu.vendorId === id);
        this.xc = this.xc.filter(xc => xc.vendorId === id);
    }

    async commit() {
        let artifacts = this.artifactsDir;

        sort(this.tools);
        sort(this.fmus);
        sort(this.xc);

        // Writing tools
        fs.mkdirpSync(artifacts);
        let artifactsDir = path.join(artifacts, toolsFile);
        fs.writeFileSync(artifactsDir, JSON.stringify(this.tools, null, 4));
        fileDebug("  Artifacts file for tools written to: %s", artifactsDir);

        fileDebug("  Writing fmus.json file in %s", artifacts);
        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, fmusFile), JSON.stringify(this.fmus, null, 4));

        fileDebug("  Writing xc_results.json in %s", artifacts);
        fs.mkdirpSync(artifacts);
        fs.writeFileSync(path.join(artifacts, xcFile), JSON.stringify(this.xc, null, 4));
    }

    async close() {
        return undefined;
    }
}
