export interface AnalyticsSeedData {
    defaultConfigs: Record<string, unknown>;
    defaultTemplates: Array<{
        code: string;
        nameEn: string;
        nameAr: string;
        data: Record<string, unknown>;
    }>;
    dashboardTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        defaultRefreshMinutes: number;
        color: string;
    }>;
    widgetTypes: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        supportsRealtime: boolean;
    }>;
    dataSources: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        moduleCode?: string;
        requiresAuth: boolean;
    }>;
    refreshIntervals: Array<{
        minutes: number;
        labelEn: string;
        labelAr: string;
    }>;
    dashboardStatuses: Array<{
        code: string;
        labelEn: string;
        labelAr: string;
        terminal: boolean;
        color: string;
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
export declare function getAnalyticsSeedData(): AnalyticsSeedData;
export declare function seedAnalyticsModule(tenantId: string, schema: string): Promise<void>;
