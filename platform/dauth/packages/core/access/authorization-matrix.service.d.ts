export interface AuthorizationCheckInput {
    entityType?: string;
    entityId?: string;
    scopeType?: string;
    scopeId?: string;
}
export interface AuthorizationDecision {
    allowed: boolean;
    reason: string;
    authority?: string;
    delegated?: boolean;
}
/**
 * Evaluate whether `userId` may execute `action` in tenant `tenantId`.
 *
 * Resolution order:
 *  1. Direct role-based permissions
 *  2. Decision authority escalation (elevated actions)
 *  3. Active delegation chains
 *  4. Deny by default (Law 11)
 *
 * Every call is logged to `authz_decision_log` (Law 12 — audit by default).
 */
export declare function can(tenantId: string, userId: string, action: string, opts?: AuthorizationCheckInput): Promise<AuthorizationDecision>;
