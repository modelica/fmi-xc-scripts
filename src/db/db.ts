import { ToolsTable, FMUTable, CrossCheckTable } from "@modelica/fmi-data";

/**
 * This is the interface for any persistence layer that is being used to store
 * FMI export and cross check data.  This abstraction is used by several functions
 * in the 'core' library.
 */
export interface Database {
    open(): Promise<void>;
    /**
     * The tools listed are all the tools associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    updateTools(updates: ToolsTable, vendorId: string): Promise<void>;
    /**
     * The FMUs listed are all the FMUs associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    updateFMUs(updates: FMUTable, vendorId: string): Promise<void>;
    /**
     * The CrossCheck results listed are all the CrossCheck associated with specified vendor (and only tools
     * associated with the specified vendor).
     */
    updateCrossChecks(updates: CrossCheckTable, vendorId: string): Promise<void>;
    /**
     * Remove all references to material associated with a given vendor.
     * @param id Vendor id
     */
    removeVendor(id: string): Promise<void>;
    commit(): Promise<void>;
    close(): Promise<void>;
}
