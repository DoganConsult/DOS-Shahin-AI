export interface OooDelegationResult {
    activated: number;
    expired: number;
}
export interface DelegationResult {
    delegationId: string;
    accepted: boolean;
    delegateeUserId?: string;
    reason: string;
}
export interface PolicyEnforcementResult {
    valid: boolean;
    violations: string[];
}
export interface DelegationPolicyCheck {
    allowed: boolean;
    violations: string[];
    policyId?: string;
    maxDurationHours?: number;
    requiresCompetency?: boolean;
    allowed_actions?: string[];
    excluded_actions?: string[];
}
/**
 * Scans `user_availability` for users who are currently OOO and
 * activates/expires delegation chains based on `delegation_policies`.
 *
 * Called by the platform scheduler (cron).
 */
export declare function processOooDelegations(tenantId: string): Promise<OooDelegationResult>;
/**
 * Creates a delegation from `delegatorUserId` to the best-qualified
 * candidate from `candidateUserIds`, validating that the chosen
 * delegate possesses all `requiredCompetencies`.
 *
 * Iterates candidates in order and selects the first one that
 * meets all competency requirements and passes SoD checks.
 *
 * @param tenantId - Tenant identifier
 * @param delegatorUserId - The user delegating authority
 * @param candidateUserIds - Ordered list of potential delegates
 * @param requiredCompetencies - Competency codes the delegate must hold
 * @param delegationType - Type of delegation (e.g. 'acting', 'ooo_auto')
 * @param validTo - Optional expiration date/string
 * @returns DelegationResult or null if no qualified candidate found
 */
export declare function delegateWithCompetencyCheck(tenantId: string, delegatorUserId: string, candidateUserIds: string[], requiredCompetencies: string[], delegationType?: string, validTo?: string | Date): Promise<DelegationResult | null>;
/**
 * Checks whether a delegation from a given delegator_role_code to a
 * delegate_actor_type within a scope_type is permitted by the tenant's
 * delegation_policies table.
 *
 * Evaluates: excluded_actions, allowed_actions, requires_competency,
 * max_duration_hours, and scope_type constraints.
 *
 * @param tenantId - Tenant identifier
 * @param delegatorRole - The delegator_role_code to check
 * @param delegateActorType - The delegate_actor_type (human, agent, etc.)
 * @param scopeType - The scope_type (tenant, department, etc.)
 * @param actions - List of actions being delegated
 * @returns DelegationPolicyCheck with allowed status and any violations
 */
export declare function enforceDelegationPolicy(tenantId: string, delegatorRole: string, delegateActorType: string, scopeType: string, actions?: string[]): Promise<DelegationPolicyCheck>;
