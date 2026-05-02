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
    requestMethod?: string;
    userAgent?: string;
    sessionId?: string;
    delegationChain?: {
        fromUserId: string;
        toUserId: string;
        scope: string;
    }[];
    correlationId?: string;
}
export interface AccessDecision {
    allowed: boolean;
    failedStep: number | null;
    failedCheck: string | null;
    reason: string;
    matchedRole?: string;
    matchedScopeType?: string;
    delegatedFrom?: string;
    steps: StepResult[];
}
interface StepResult {
    step: number;
    name: string;
    passed: boolean;
    detail?: string;
}
export declare function invalidatePermissionCache(tenantId?: string): void;
export declare function evaluateAccess(ctx: AccessDecisionContext): Promise<AccessDecision>;
export {};
