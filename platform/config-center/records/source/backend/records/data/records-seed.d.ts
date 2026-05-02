export interface RetentionPolicySeed {
    code: string;
    nameEn: string;
    nameAr: string;
    recordType: string;
    classification: string;
    retentionDays: number;
    legalBasis: string;
}
export interface RecordsSeedData {
    defaultConfigs: Record<string, unknown>;
    retentionPolicies: RetentionPolicySeed[];
    recordTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
    }>;
    classifications: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        retentionMultiplier: number;
    }>;
    disposalMethods: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
    }>;
    recordStatuses: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        terminal: boolean;
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
export declare function getRecordsSeedData(): RecordsSeedData;
export declare function seedRecordsModule(tenantId: string, schema: string): Promise<void>;
