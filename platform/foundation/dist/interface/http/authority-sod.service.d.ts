export interface AuthorityKind {
    authority_kind: string;
    name_en: string;
    name_ar: string | null;
    description_en: string | null;
    is_monetary: boolean;
    default_unit: string | null;
    is_active: boolean;
}
export interface PositionAuthority {
    id: string;
    tenant_id: string;
    position_id: string;
    authority_kind: string;
    monetary_limit: string | null;
    monetary_unit: string | null;
    qualifications: string[] | null;
    conditions: Record<string, unknown>;
    effective_from: string | null;
    effective_to: string | null;
    is_active: boolean;
}
export interface SodRule {
    rule_code: string;
    tenant_id: string | null;
    name_en: string;
    name_ar: string | null;
    description_en: string | null;
    rule_kind: 'mutually_exclusive_roles' | 'blocked_role_pair' | 'blocked_authority_pair' | 'time_separation' | 'approval_self_block' | 'committee_self_block';
    parameters: Record<string, unknown>;
    severity: 'low' | 'medium' | 'high' | 'critical';
    is_enforcing: boolean;
    remediation_hint_en: string | null;
    remediation_hint_ar: string | null;
    is_active: boolean;
}
export interface SodViolation {
    id: string;
    tenant_id: string;
    rule_code: string;
    user_id: string;
    detected_at: string;
    context: Record<string, unknown>;
    severity: string | null;
    resolution: 'open' | 'accepted_risk' | 'remediated' | 'false_positive' | 'expired';
    resolution_note: string | null;
    resolved_at: string | null;
    resolved_by: string | null;
}
export interface SodCheckInput {
    userId: string;
    /** Existing roles + the proposed-new role. Pass [] to check current state. */
    proposedRoles?: string[];
    /** What action is being attempted (for self-block / authority checks). */
    attemptedAction?: {
        authority_kind: string;
        initiator_id?: string;
        amount?: number;
    };
    /** Current delegations granted to this user (for time-separation checks). */
    recentDelegations?: {
        granted_at: string;
        authority_kind: string;
    }[];
}
export interface SodCheckResult {
    passed: boolean;
    violations: {
        rule: SodRule;
        reason: string;
        severity: string;
    }[];
    warnings: {
        rule: SodRule;
        reason: string;
    }[];
}
export declare function listAuthorityKinds(): Promise<AuthorityKind[]>;
export declare function listPositionAuthority(tenantId: string, positionId: string): Promise<PositionAuthority[]>;
export declare function listAuthorityMatrix(tenantId: string): Promise<{
    position_id: string;
    authorities: PositionAuthority[];
}[]>;
export declare function setPositionAuthority(tenantId: string, input: {
    position_id: string;
    authority_kind: string;
    monetary_limit?: number | null;
    monetary_unit?: string | null;
    qualifications?: string[];
    conditions?: Record<string, unknown>;
    effective_from?: string | null;
    effective_to?: string | null;
}, actorId: string): Promise<PositionAuthority>;
export declare function listRules(tenantId: string): Promise<SodRule[]>;
export declare function check(tenantId: string, input: SodCheckInput): Promise<SodCheckResult>;
export declare function recordViolation(tenantId: string, input: {
    ruleCode: string;
    userId: string;
    severity?: string;
    context?: Record<string, unknown>;
}): Promise<SodViolation>;
export declare function listViolations(tenantId: string, filter?: {
    resolution?: string;
    severity?: string;
    userId?: string;
}): Promise<SodViolation[]>;
export declare function resolveViolation(tenantId: string, violationId: string, resolution: 'accepted_risk' | 'remediated' | 'false_positive' | 'expired', note: string | undefined, actorId: string): Promise<SodViolation | null>;
