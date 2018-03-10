import { Database } from "./db";
import { ToolsTable, FMUTable, CrossCheckTable } from "@modelica/fmi-data";

import * as debug from "debug";
const dryrunDebug = debug("fmi:dryrun");

export class DryrunDatabase implements Database {
    async open(): Promise<void> {
        dryrunDebug("Dryrun: opening db");
        return undefined;
    }
    /**
     * The tools listed are all the tools associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    async updateTools(_updates: ToolsTable, vendorId: string): Promise<void> {
        dryrunDebug("Dryrun: updating tools for %s", vendorId);
        return undefined;
    }
    /**
     * The FMUs listed are all the FMUs associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    async updateFMUs(_updates: FMUTable, vendorId: string): Promise<void> {
        dryrunDebug("Dryrun: updating FMUs for %s", vendorId);
        return undefined;
    }
    /**
     * The CrossCheck results listed are all the CrossCheck associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    async updateCrossChecks(_updates: CrossCheckTable, vendorId: string): Promise<void> {
        dryrunDebug("Dryrun: updating cross checks for %s", vendorId);
        return undefined;
    }
    async removeVendor(_id: string): Promise<void> {
        return undefined;
    }
    async commit(): Promise<void> {
        dryrunDebug("Dryrun: committing database");
        return undefined;
    }
    async close(): Promise<void> {
        dryrunDebug("Dryrun: closing database");
        return undefined;
    }
}
