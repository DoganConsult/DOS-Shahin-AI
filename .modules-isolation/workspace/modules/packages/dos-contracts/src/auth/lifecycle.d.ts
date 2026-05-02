export interface LifecycleTransitionRequest {
    tenantId: string;
    userId: string;
    moduleCode: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    permissionCode: string;
    userRoles: string[];
    authorityLevelCode?: string;
    ownerId?: string;
}
export interface TransitionCheckResult {
    check: 'permissionValid' | 'transitionValid' | 'authorityValid' | 'ownershipValid' | 'sodValid' | 'approvalRequired';
    passed: boolean;
    detail?: string;
}
export interface LifecycleAuthDecision {
    allowed: boolean;
    reason: string;
    checks: TransitionCheckResult[];
    evaluatedAt: string;
    permissionCode: string;
    approvalRequired: boolean;
}
