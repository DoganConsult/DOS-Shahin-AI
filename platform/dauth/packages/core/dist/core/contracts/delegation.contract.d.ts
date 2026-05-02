/**
 * DAuth Contract — Delegation Grant / Revoke Shapes
 *
 * Canonical request/response interfaces for delegation operations (section 9, section 16).
 * Delegation scopes map to bounded sets of module.resource.action permissions.
 *
 * Field names align with delegation_grants / delegation_actions tables
 * from table-classification.ts Bucket 1 (runtime truth).
 */
/** Bounded delegation scope — each maps to specific module.resource.action permissions. */
export type DelegationScopeCode = 'onboarding' | 'workspace_setup' | 'policy_drafting' | 'risk_seeding' | 'control_mapping' | 'evidence_upload' | 'assessment';
/** Request to create a new delegation grant. */
export interface DelegationGrantRequest {
    tenantId: string;
    /** The user granting delegation (delegator). */
    userId: string;
    /** The agent or user receiving delegated authority. */
    agentId: string;
    /** Scopes being delegated — cannot exceed delegator's own permissions. */
    scopes: DelegationScopeCode[];
    /** Duration in minutes (default: 60). */
    durationMinutes?: number;
}
/** Canonical delegation grant record. */
export interface DelegationGrant {
    grantId: string;
    tenantId: string;
    userId: string;
    agentId: string;
    scopes: DelegationScopeCode[];
    expiresAt: string;
    revokedAt: string | null;
    createdAt: string;
}
/** Request to revoke an active delegation grant. */
export interface DelegationRevocation {
    tenantId: string;
    grantId: string;
    /** The user or system revoking the grant. */
    revokedBy: string;
    /** Optional reason for audit trail. */
    reason?: string;
}
/** Result of validating whether an active delegation exists. */
export interface DelegationValidation {
    valid: boolean;
    grant: DelegationGrant | null;
    /** If invalid, the reason the delegation was not found or is expired. */
    reason?: string;
}
