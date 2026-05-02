export declare class UnifiedConfigService {
    private static resolveRegisteredProductKey;
    static resolve<T>(key: string, options?: {
        tenantId?: string;
        workspaceId?: string;
        userId?: string;
        moduleCode?: string;
        roleCode?: string;
        dashboardCode?: string;
    }): Promise<T | undefined>;
    static resolveWithMetadata<T>(key: string, options?: {
        tenantId?: string;
        workspaceId?: string;
        userId?: string;
        moduleCode?: string;
        roleCode?: string;
        dashboardCode?: string;
    }): Promise<{
        value: T | undefined;
        source: string;
        overridenLayers: string[];
    }>;
    static resolveSync<T>(key: string, options?: {
        roleCode?: string;
        dashboardCode?: string;
    }): T | undefined;
    static resolveSyncWithMetadata<T>(key: string, options?: {
        roleCode?: string;
        dashboardCode?: string;
    }): {
        value: T | undefined;
        source: string;
        overridenLayers: string[];
    };
    private static parseEnvValue;
    private static getDeploymentOverride;
    private static getPlatformDefault;
}
