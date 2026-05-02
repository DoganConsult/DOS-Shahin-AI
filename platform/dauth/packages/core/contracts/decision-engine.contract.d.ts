/**
 * Decision engine contract — 14-step access evaluation pipeline types.
 * Core authorization decision structures consumed by services and tests.
 */
export interface AccessDecisionContext {
    userId: string;
    tenantId: string;
    role: string;
    roles?: string[];
    isSuperAdmin?: boolean;
    permissionCode: string;
    moduleCode?: string;
    scopeType?: string;
    scopeId?: string;
    authorityRequired?: string;
    lifecycleFromState?: string;
    lifecycleToState?: string;
    entityType?: string;
    entityId?: string;
    ip?: string;
    path?: string;
    actorId?: string;
    ownershipRequired?: boolean;
}
export interface AccessDecision {
    allowed: boolean;
    failedStep: number | null;
    failedCheck: string | null;
    reason: string;
    matchedRole?: string;
    matchedScopeType?: string;
    delegatedFrom?: string;
    steps: AccessDecisionStep[];
}
export interface AccessDecisionStep {
    step: number;
    name: string;
    passed: boolean;
    detail: string;
    durationMs?: number;
}
