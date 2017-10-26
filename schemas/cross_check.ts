import { FMIVersion, FMIVariant, FMIPlatform, ToolDetails } from './fmi';

export enum CrossCheckResult {
    Passed = "passed",
    Rejected = "rejected",
    Failed = "failed",
}

export interface CrossCheckSummary {
    version: FMIVersion;
    variant: FMIVariant;
    platform: FMIPlatform;
    importer: ToolDetails;
    exporter: ToolDetails;
    passed: string[];
    rejected: string[];
    failed: string[];
}

export type CrossCheckTable = CrossCheckSummary[];