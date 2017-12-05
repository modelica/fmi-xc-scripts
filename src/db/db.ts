import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from '@modelica/fmi-data';

/**
 * This is the interface for any persistence layer that is being used to store 
 * FMI export and cross check data.  This abstraction is used by several functions
 * in the 'core' library.
 */
export interface Database {
    loadTools(artifacts: string): Promise<ToolsTable>;
    pushTools(toolMap: Map<string, ToolSummary>, _locals: string[], artifacts: string): Promise<void>;
    pushFMUs(fmus: FMUTable, _local: string[], artifacts: string): Promise<void>;
    pushCrossChecks(xc: CrossCheckTable, _local: string[], artifacts: string): Promise<void>;
}
