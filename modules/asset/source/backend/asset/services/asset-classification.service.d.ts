interface CreateClassificationInput {
    code: string;
    name_en: string;
    name_ar?: string;
    description?: string;
    level: number;
    color?: string;
    handling_requirements?: string;
    retention_period_days?: number;
    requires_encryption?: boolean;
    requires_dlp?: boolean;
}
export declare function listClassifications(tenantId: string): Promise<any[]>;
export declare function getClassificationById(tenantId: string, id: string): Promise<any>;
export declare function createClassification(tenantId: string, input: CreateClassificationInput): Promise<any>;
export declare function updateClassification(tenantId: string, id: string, updates: Partial<CreateClassificationInput>): Promise<any>;
export declare function classifyAsset(tenantId: string, userId: string, assetId: string, classificationId: string): Promise<any>;
export declare function getClassificationDistribution(tenantId: string): Promise<any[]>;
export {};
