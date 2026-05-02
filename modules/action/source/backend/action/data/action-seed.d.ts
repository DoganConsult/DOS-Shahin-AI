export interface ActionSeedData {
    defaultConfigs: Record<string, unknown>;
    actionTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        defaultPriority: string;
    }>;
    sourceTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        moduleLink: string | null;
    }>;
    priorities: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        slaHours: number;
        color: string;
    }>;
    actionStatuses: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        terminal: boolean;
    }>;
    recurrenceTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
    }>;
    permissions?: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        module: string;
    }>;
    roles?: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        permissions: string[];
    }>;
    actions?: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        permissionRequired: string;
    }>;
}
export declare function getActionSeedData(): ActionSeedData;
export declare function seedActionModule(tenantId: string, schema: string): Promise<void>;
