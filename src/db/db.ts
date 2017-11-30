import { ToolsTable, ToolSummary, FMUTable, CrossCheckTable } from '@modelica/fmi-data';

export interface Database {
    loadTools(artifacts: string): Promise<ToolsTable>;
    pushTools(toolMap: Map<string, ToolSummary>, _locals: string[], artifacts: string): Promise<void>;
    pushFMUs(fmus: FMUTable, _local: string[], artifacts: string): Promise<void>;
    pushCrossChecks(xc: CrossCheckTable, _local: string[], artifacts: string): Promise<void>;
}
