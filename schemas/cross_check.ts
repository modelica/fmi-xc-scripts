import { FMIVersion, FMIVariant, FMIPlatform, ToolDetails } from './fmi';

export enum CrossCheckResult {
    Passed = "passed",
    Rejected = "rejected",
    Failed = "failed",
}

export type ResultsSummary = { [modelName: string]: CrossCheckResult };

export interface CrossCheckSummary {
    version: FMIVersion;
    variant: FMIVariant;
    platform: FMIPlatform;
    importer: ToolDetails;
    exporter: ToolDetails;
    results: ResultsSummary;
}

export type CrossCheckTable = CrossCheckSummary[];