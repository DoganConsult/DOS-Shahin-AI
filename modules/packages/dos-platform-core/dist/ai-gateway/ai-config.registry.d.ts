export interface ModuleAiConfig {
    moduleCode: string;
    enabled: boolean;
    allowedActions: readonly string[];
    blockedActions: readonly string[];
    humanInLoopBoundaries: {
        requiresHumanApproval: readonly string[];
        requiresHumanReview: readonly string[];
        autoExecutable: readonly string[];
    };
    modelDependencies: {
        primary: string;
        fallback: string;
        embeddingModel: string;
    };
    promptContracts: {
        maxInputTokens: number;
        maxOutputTokens: number;
        temperature: number;
        systemPromptTemplate: string;
    };
    safetyHooks: {
        inputValidation: boolean;
        outputValidation: boolean;
        promptInjectionProtection: boolean;
        piiRedaction: boolean;
        auditAllInvocations: boolean;
        maxInvocationsPerHour: number;
        rateLimitPerTenant: number;
    };
}
export interface TenantAiOverride {
    enabled?: boolean;
    maxOutputTokens?: number;
    temperature?: number;
    primaryModel?: string;
    fallbackModel?: string;
    maxInvocationsPerHour?: number;
    rateLimitPerTenant?: number;
}
export declare function registerModuleAiConfig(config: ModuleAiConfig): void;
export declare function getDefaultAiConfig(moduleCode: string): ModuleAiConfig | undefined;
export declare function resolveAiConfig(tenantId: string, moduleCode: string): Promise<ModuleAiConfig>;
export declare function invalidateTenantAiCache(tenantId: string, moduleCode?: string): void;
export declare function getAllRegisteredAiConfigs(): ReadonlyMap<string, ModuleAiConfig>;
export declare function isActionAllowed(config: ModuleAiConfig, action: string): boolean;
export declare function isActionBlocked(config: ModuleAiConfig, action: string): boolean;
export declare function requiresHumanApproval(config: ModuleAiConfig, action: string): boolean;
