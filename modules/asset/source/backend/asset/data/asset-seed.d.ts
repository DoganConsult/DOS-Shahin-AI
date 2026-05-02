export interface AssetSeedData {
    defaultConfigs: Record<string, unknown>;
    assetTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
    }>;
    classificationLevels: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        color: string;
    }>;
    criticalityLevels: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        slaHours: number;
    }>;
    ownershipTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
    }>;
    environments: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
    }>;
    assetStatuses: Array<{
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
export declare function getAssetSeedData(): AssetSeedData;
export declare function seedAssetModule(tenantId: string, schema: string): Promise<void>;
