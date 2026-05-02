export type AiActionDecision = 'execute' | 'defer' | 'escalate' | 'block' | string;
export type AiActionClass = 'read' | 'write' | 'approve' | 'generate' | 'analyze' | string;
export type AiAutonomyLevel = 'human_only' | 'ai_assisted' | 'ai_autonomous' | 'shadow' | string;
export type ArchetypeCode = string;
export interface ArchetypeResolutionInput {
    sector?: string;
    country?: string;
    orgType?: string;
    size?: string;
    maturity?: string;
    [k: string]: unknown;
}
export interface TenantBlueprint {
    tenantId?: string;
    archetypeCode?: ArchetypeCode;
    modules?: string[];
    features?: Record<string, boolean>;
    createdAt?: string;
    [k: string]: unknown;
}
export interface BlueprintOverrides {
    modules?: string[];
    features?: Record<string, boolean>;
    roles?: string[];
    [k: string]: unknown;
}
export interface BlueprintProvisionResult {
    tenantId?: string;
    provisioned?: boolean;
    modulesActivated?: string[];
    errors?: string[];
    [k: string]: unknown;
}
export interface FunctionalRoleBundle {
    bundleCode?: string;
    name?: string;
    roles?: FunctionalRoleBundleItem[];
    [k: string]: unknown;
}
export interface FunctionalRoleBundleItem {
    roleCode?: string;
    roleName?: string;
    permissions?: string[];
    [k: string]: unknown;
}
export interface PlatformRoleTenantRoleMap {
    platformRole?: string;
    tenantRoles?: string[];
    [k: string]: unknown;
}
export interface PolicyDecisionLogEntry {
    decisionId?: string;
    policyCode?: string;
    action?: string;
    result?: string;
    actor?: string;
    timestamp?: string;
    reason?: string;
    [k: string]: unknown;
}
export interface ModuleActivationState {
    moduleCode?: string;
    active?: boolean;
    activatedAt?: string;
    activatedBy?: string;
    [k: string]: unknown;
}
