"use strict";
/**
 * Reason codes emitted by DAuth's decision-engine. Every permit/deny writes
 * exactly one code to authz_decision_log. Keep this list closed — new codes
 * require a contract change so SIEM dashboards stay stable.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTHZ_REASON_CODES = void 0;
exports.AUTHZ_REASON_CODES = {
    PERMIT_PLATFORM_ADMIN: 'permit.platform_admin',
    PERMIT_TENANT_ADMIN: 'permit.tenant_admin',
    PERMIT_TENANT_MEMBER: 'permit.tenant_member',
    PERMIT_MODULE_TIER: 'permit.module_tier',
    PERMIT_REBAC: 'permit.rebac',
    PERMIT_ABAC: 'permit.abac',
    PERMIT_DELEGATED: 'permit.delegated',
    DENY_TOKEN_INVALID: 'deny.token_invalid',
    DENY_TOKEN_EXPIRED: 'deny.token_expired',
    DENY_TOKEN_AUDIENCE: 'deny.token_audience',
    DENY_TOKEN_ACR_LOW: 'deny.token_acr_low',
    DENY_DPOP_INVALID: 'deny.dpop_invalid',
    DENY_SESSION_REVOKED: 'deny.session_revoked',
    DENY_NOT_TENANT_MEMBER: 'deny.not_tenant_member',
    DENY_NO_PRODUCT_ENTITLEMENT: 'deny.no_product_entitlement',
    DENY_NO_MODULE_ENTITLEMENT: 'deny.no_module_entitlement',
    DENY_SOD_VIOLATION: 'deny.sod_violation',
    DENY_REBAC_NO_RELATION: 'deny.rebac_no_relation',
    DENY_ABAC_POLICY: 'deny.abac_policy',
    DENY_RLS_MISMATCH: 'deny.rls_mismatch',
    DENY_INTERNAL_ERROR: 'deny.internal_error',
};
//# sourceMappingURL=reason-codes.js.map