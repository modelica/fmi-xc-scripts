export enum FMIVersion {
    FMI1 = "FMI_1.0",
    FMI2 = "FMI_2.0",
}

export enum FMIVariant {
    CS = "CoSimulation",
    ME = "ModelExchange",
}

export enum FMIPlatform {
    Code = "c-code",
    Win32 = "win32",
    Win64 = "win64",
    Linux32 = "linux32",
    Linux64 = "linux64",
}

export interface ToolDetails {
    tool: string;
    version: string;
}
