export interface ApprovalRule {
    ruleId: string;
    actionCode: string;
    moduleCode: string;
    requiredAuthorityCode: string;
    minApprovals: number;
    valueThreshold: number | null;
    isActive: boolean;
}
export interface RequiredApproval {
    authorityCode: string;
    minApprovals: number;
    valueThreshold: number | null;
}
export interface CreateApprovalRuleInput {
    actionCode: string;
    moduleCode: string;
    requiredAuthorityCode: string;
    minApprovals: number;
    valueThreshold?: number | null;
}
/** Result of checking whether an actor satisfies the approval matrix for a transition. */
export interface ApprovalMatrixCheckResult {
    /** Whether the actor can approve this transition. */
    canApprove: boolean;
    /** If approval is needed, which authority codes are required. */
    requiredApprovals: RequiredApproval[];
    /** The actor's authority codes (if any). */
    actorAuthorityCodes: string[];
    /** Reason string for audit logging. */
    reason: string;
}
/** List approval rules, optionally filtered by module code. */
export declare function getApprovalRules(tenantId: string, moduleCode?: string): Promise<ApprovalRule[]>;
/** Lookup a single approval rule by ID. */
export declare function getApprovalRule(tenantId: string, ruleId: string): Promise<ApprovalRule | null>;
/** Create a new approval rule. */
export declare function createApprovalRule(tenantId: string, input: CreateApprovalRuleInput, createdBy: string): Promise<ApprovalRule>;
/** Soft-deactivate an approval rule. */
export declare function deactivateApprovalRule(tenantId: string, ruleId: string, deactivatedBy: string): Promise<void>;
/** Quick check whether any active approval rule exists for the given action and module. */
export declare function isApprovalRequired(tenantId: string, action: string, moduleCode: string): Promise<boolean>;
/**
 * Determine the required approvers for an action.
 *
 * Looks up all active rules matching the action and module code.
 * If entityValue is provided, only rules whose value_threshold is NULL
 * or <= entityValue are returned (escalation-style filtering).
 */
export declare function getRequiredApprovers(tenantId: string, action: string, moduleCode: string, entityValue?: number): Promise<RequiredApproval[]>;
/**
 * Check whether an actor satisfies the approval matrix for a given transition action.
 *
 * Called by lifecycle-auth.service.ts when a transition has `requires_approval = true`.
 * Looks up all approval_matrix_rules for the action+module pair, then checks
 * whether the actor holds any of the required authority codes.
 *
 * @param tenantId  - Tenant identifier
 * @param userId    - The actor attempting the transition
 * @param action    - The action code (e.g. 'risk.approve', 'policy.publish')
 * @param moduleCode - Module code
 * @param entityValue - Optional monetary/impact value for threshold-based escalation
 */
export declare function checkActorAuthority(tenantId: string, userId: string, action: string, moduleCode: string, entityValue?: number): Promise<ApprovalMatrixCheckResult>;
