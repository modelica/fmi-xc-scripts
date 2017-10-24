export enum Status {
    Unsupported = "unsupported",
    Planned = "planned",
    Available = "available",
}

export interface VariantSupport {
    status: Status;
    num: number;
    platforms: {
        darwin64?: number;
        linux32?: number;
        linux64?: number;
        win32?: number;
        win64?: number;
    }
}

export interface ToolSummary {
    toolName: string;
    homepage: string;
    email: string;
    note: string;
    fmi1: {
        "export": VariantSupport,
        "import": VariantSupport,
        "slave": VariantSupport,
        "master": VariantSupport,
    },
    fmi2: {
        "export": VariantSupport,
        "import": VariantSupport,
        "slave": VariantSupport,
        "master": VariantSupport,
    }
}

export type ToolsTable = ToolSummary[];

