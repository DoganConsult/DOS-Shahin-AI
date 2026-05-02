/**
 * Reason codes emitted by DAuth's decision-engine. Every permit/deny writes
 * exactly one code to authz_decision_log. Keep this list closed — new codes
 * require a contract change so SIEM dashboards stay stable.
 */
export declare const AUTHZ_REASON_CODES: {
    readonly PERMIT_PLATFORM_ADMIN: "permit.platform_admin";
    readonly PERMIT_TENANT_ADMIN: "permit.tenant_admin";
    readonly PERMIT_TENANT_MEMBER: "permit.tenant_member";
    readonly PERMIT_MODULE_TIER: "permit.module_tier";
    readonly PERMIT_REBAC: "permit.rebac";
    readonly PERMIT_ABAC: "permit.abac";
    readonly PERMIT_DELEGATED: "permit.delegated";
    readonly DENY_TOKEN_INVALID: "deny.token_invalid";
    readonly DENY_TOKEN_EXPIRED: "deny.token_expired";
    readonly DENY_TOKEN_AUDIENCE: "deny.token_audience";
    readonly DENY_TOKEN_ACR_LOW: "deny.token_acr_low";
    readonly DENY_DPOP_INVALID: "deny.dpop_invalid";
    readonly DENY_SESSION_REVOKED: "deny.session_revoked";
    readonly DENY_NOT_TENANT_MEMBER: "deny.not_tenant_member";
    readonly DENY_NO_PRODUCT_ENTITLEMENT: "deny.no_product_entitlement";
    readonly DENY_NO_MODULE_ENTITLEMENT: "deny.no_module_entitlement";
    readonly DENY_SOD_VIOLATION: "deny.sod_violation";
    readonly DENY_REBAC_NO_RELATION: "deny.rebac_no_relation";
    readonly DENY_ABAC_POLICY: "deny.abac_policy";
    readonly DENY_RLS_MISMATCH: "deny.rls_mismatch";
    readonly DENY_INTERNAL_ERROR: "deny.internal_error";
};
export type AuthzReasonCode = (typeof AUTHZ_REASON_CODES)[keyof typeof AUTHZ_REASON_CODES];
export interface AuthzDecision {
    readonly allow: boolean;
    readonly reasonCode: AuthzReasonCode;
    readonly detail?: string;
    readonly evaluatedLayers: readonly ('token' | 'session' | 'rbac' | 'tenant' | 'product' | 'module' | 'sod' | 'rebac' | 'abac' | 'rls')[];
    readonly latencyMs: number;
}
