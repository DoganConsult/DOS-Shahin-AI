export interface GovernanceContextSummary {
    tenantId: string;
    contextVersion: number;
    complexity: string;
    businessProfile: Record<string, unknown>;
    regulatoryProfile: Record<string, unknown>;
    frameworkProfile: Record<string, unknown>;
    moduleProfile: Record<string, unknown>;
    ownershipProfile: Record<string, unknown>;
    personaProfile: Record<string, unknown>;
    painProfile: Record<string, unknown>;
    automationProfile: Record<string, unknown>;
    agentProfile: Record<string, unknown>;
    computedAt: string;
}
export interface ModuleOperatingStateSummary {
    moduleCode: string;
    state: 'on' | 'off' | 'trial';
    activationSource: string;
    trialExpiryAt: string | null;
    isMandatory: boolean;
}
export declare function invalidateContextCache(tenantId: string): void;
export declare function readGovernanceContext(tenantId: string): Promise<GovernanceContextSummary | null>;
export declare function readModuleOperatingStates(tenantId: string): Promise<ModuleOperatingStateSummary[]>;
export declare function isModuleOn(states: ModuleOperatingStateSummary[], moduleCode: string): boolean;
