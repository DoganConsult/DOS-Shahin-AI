export interface LifecycleAuthResult {
    allowed: boolean;
    reason: string;
    checks: {
        permissionValid: boolean;
        transitionValid: boolean;
        authorityValid: boolean;
        ownershipValid: boolean;
        sodValid: boolean;
        approvalRequired: boolean;
        /** When approvalRequired=true, indicates if the actor can approve directly. */
        approvalSatisfied: boolean;
    };
    /** Required authority codes when approval is needed but actor cannot approve. */
    requiredApprovalAuthorities?: string[];
}
/**
 * Evaluate whether an actor can perform a lifecycle state transition.
 * §11.2 inputs: current state, target state, module/entity type, permission,
 * decision authority, ownership, approval matrix, SoD, delegation, escalation.
 */
export declare function evaluateLifecycleTransition(tenantId: string, userId: string, opts: {
    moduleCode: string;
    entityType: string;
    entityId: string;
    fromState: string;
    toState: string;
    permissionCode: string;
    userRoles: string[];
    authorityLevelCode?: string;
    ownerId?: string;
    /** Optional entity value for threshold-based approval escalation. */
    entityValue?: number;
}): Promise<LifecycleAuthResult>;
