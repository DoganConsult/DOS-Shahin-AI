"use strict";
/**
 * DAuth reason code catalog — canonical identifiers for every allow/deny.
 *
 * Every entry written to the decision ledger MUST carry at least one reason
 * code from this enum. This lets dashboards, alerting, and downstream audit
 * tools work against a stable vocabulary instead of parsing free-text reasons.
 *
 * Naming convention: `DAUTH_<VERB>_<SUBJECT>` where VERB is ALLOW or DENY.
 * Subjects map roughly to the 14-step pipeline in `access/decision-engine.ts`
 * plus engine-specific codes for Keycloak / Cerbos / OpenFGA failures.
 *
 * Adding a new code: append here, update the decision-engine step that emits
 * it, and document the trigger condition in the JSDoc. Never renumber or
 * remove codes — the ledger references them by string value.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAUTH_REASON_CODES = void 0;
exports.reasonCodeForStep = reasonCodeForStep;
exports.isAllowCode = isAllowCode;
exports.isDenyCode = isDenyCode;
exports.isAbstainCode = isAbstainCode;
exports.DAUTH_REASON_CODES = {
    // ── Allow (all 14 steps passed) ──────────────────────────────────────
    ALLOW_ALL_CHECKS_PASSED: 'DAUTH_ALLOW_ALL_CHECKS_PASSED',
    ALLOW_SUPER_ADMIN_BYPASS: 'DAUTH_ALLOW_SUPER_ADMIN_BYPASS',
    ALLOW_ONBOARDING_BYPASS: 'DAUTH_ALLOW_ONBOARDING_BYPASS',
    ALLOW_GRC_FALLBACK: 'DAUTH_ALLOW_GRC_FALLBACK',
    ALLOW_DELEGATED: 'DAUTH_ALLOW_DELEGATED',
    ALLOW_OWNED: 'DAUTH_ALLOW_OWNED',
    // ── Deny — Step 1-3: actor / session / membership ────────────────────
    DENY_NOT_AUTHENTICATED: 'DAUTH_DENY_NOT_AUTHENTICATED',
    DENY_SESSION_INVALID: 'DAUTH_DENY_SESSION_INVALID',
    DENY_SESSION_REVOKED: 'DAUTH_DENY_SESSION_REVOKED',
    DENY_TOKEN_EXPIRED: 'DAUTH_DENY_TOKEN_EXPIRED',
    DENY_TOKEN_SIGNATURE: 'DAUTH_DENY_TOKEN_SIGNATURE',
    DENY_TOKEN_ISSUER: 'DAUTH_DENY_TOKEN_ISSUER',
    DENY_TENANT_MEMBERSHIP_MISSING: 'DAUTH_DENY_TENANT_MEMBERSHIP_MISSING',
    // ── Deny — Step 4-6: tenant / product / module ───────────────────────
    DENY_TENANT_INACTIVE: 'DAUTH_DENY_TENANT_INACTIVE',
    DENY_PRODUCT_NOT_ENTITLED: 'DAUTH_DENY_PRODUCT_NOT_ENTITLED',
    DENY_MODULE_DISABLED: 'DAUTH_DENY_MODULE_DISABLED',
    // ── Deny — Step 7-8: profile / role ──────────────────────────────────
    DENY_ACCESS_PROFILE_BLOCKED: 'DAUTH_DENY_ACCESS_PROFILE_BLOCKED',
    DENY_PERMISSION_MISSING: 'DAUTH_DENY_PERMISSION_MISSING',
    // ── Deny — Step 9-10: scope / authority ──────────────────────────────
    DENY_SCOPE_MISMATCH: 'DAUTH_DENY_SCOPE_MISMATCH',
    DENY_AUTHORITY_INSUFFICIENT: 'DAUTH_DENY_AUTHORITY_INSUFFICIENT',
    // ── Deny — Step 11: SoD ──────────────────────────────────────────────
    DENY_SOD_CONFLICT: 'DAUTH_DENY_SOD_CONFLICT',
    DENY_SOD_SELF_APPROVAL: 'DAUTH_DENY_SOD_SELF_APPROVAL',
    // ── Deny — Step 12: lifecycle ────────────────────────────────────────
    DENY_LIFECYCLE_TRANSITION: 'DAUTH_DENY_LIFECYCLE_TRANSITION',
    // ── Deny — Step 13: delegation / ownership ───────────────────────────
    DENY_OWNERSHIP_MISSING: 'DAUTH_DENY_OWNERSHIP_MISSING',
    DENY_DELEGATION_INVALID: 'DAUTH_DENY_DELEGATION_INVALID',
    DENY_DELEGATION_EXPIRED: 'DAUTH_DENY_DELEGATION_EXPIRED',
    DENY_DELEGATION_OUT_OF_SCOPE: 'DAUTH_DENY_DELEGATION_OUT_OF_SCOPE',
    // ── Deny — Engine failures (Cerbos / OpenFGA / Keycloak) ─────────────
    DENY_CERBOS: 'DAUTH_DENY_CERBOS',
    DENY_CERBOS_UNAVAILABLE: 'DAUTH_DENY_CERBOS_UNAVAILABLE',
    DENY_OPENFGA: 'DAUTH_DENY_OPENFGA',
    DENY_OPENFGA_UNAVAILABLE: 'DAUTH_DENY_OPENFGA_UNAVAILABLE',
    DENY_KEYCLOAK_UNAVAILABLE: 'DAUTH_DENY_KEYCLOAK_UNAVAILABLE',
    // ── Deny — AI-aware guards ───────────────────────────────────────────
    DENY_AI_QUOTA_EXCEEDED: 'DAUTH_DENY_AI_QUOTA_EXCEEDED',
    DENY_AI_PERMISSION_MISSING: 'DAUTH_DENY_AI_PERMISSION_MISSING',
    DENY_AI_DATA_SENSITIVITY: 'DAUTH_DENY_AI_DATA_SENSITIVITY',
    // ── Deny — Obligations / policy hints ────────────────────────────────
    DENY_EMAIL_NOT_VERIFIED: 'DAUTH_DENY_EMAIL_NOT_VERIFIED',
    DENY_MFA_REQUIRED: 'DAUTH_DENY_MFA_REQUIRED',
    DENY_DUAL_APPROVAL_REQUIRED: 'DAUTH_DENY_DUAL_APPROVAL_REQUIRED',
    // ── Abstain (shadow mode — engine had no opinion) ────────────────────
    ABSTAIN_NO_POLICY: 'DAUTH_ABSTAIN_NO_POLICY',
    ABSTAIN_SHADOW_MODE: 'DAUTH_ABSTAIN_SHADOW_MODE',
    // ── Internal (should never appear in prod) ───────────────────────────
    INTERNAL_UNKNOWN: 'DAUTH_INTERNAL_UNKNOWN',
};
/**
 * Map a 14-step pipeline failure (step number + check name) to a reason code.
 * Called from `access/decision-engine.ts#denyAndLog`.
 */
function reasonCodeForStep(step, check) {
    switch (step) {
        case 1: return exports.DAUTH_REASON_CODES.DENY_NOT_AUTHENTICATED;
        case 2: return exports.DAUTH_REASON_CODES.DENY_SESSION_INVALID;
        case 3: return exports.DAUTH_REASON_CODES.DENY_TENANT_MEMBERSHIP_MISSING;
        case 4: return exports.DAUTH_REASON_CODES.DENY_TENANT_INACTIVE;
        case 5: return exports.DAUTH_REASON_CODES.DENY_PRODUCT_NOT_ENTITLED;
        case 6: return exports.DAUTH_REASON_CODES.DENY_MODULE_DISABLED;
        case 7: return exports.DAUTH_REASON_CODES.DENY_ACCESS_PROFILE_BLOCKED;
        case 8: return exports.DAUTH_REASON_CODES.DENY_PERMISSION_MISSING;
        case 9: return exports.DAUTH_REASON_CODES.DENY_SCOPE_MISMATCH;
        case 10: return exports.DAUTH_REASON_CODES.DENY_AUTHORITY_INSUFFICIENT;
        case 11: return check.includes('self_approval')
            ? exports.DAUTH_REASON_CODES.DENY_SOD_SELF_APPROVAL
            : exports.DAUTH_REASON_CODES.DENY_SOD_CONFLICT;
        case 12: return exports.DAUTH_REASON_CODES.DENY_LIFECYCLE_TRANSITION;
        case 13: return exports.DAUTH_REASON_CODES.DENY_OWNERSHIP_MISSING;
        default: return exports.DAUTH_REASON_CODES.INTERNAL_UNKNOWN;
    }
}
/** True if the code represents an allow (all checks passed or bypass). */
function isAllowCode(code) {
    return code.startsWith('DAUTH_ALLOW_');
}
/** True if the code represents a deny (hard refusal). */
function isDenyCode(code) {
    return code.startsWith('DAUTH_DENY_');
}
/** True if the code represents an abstain (shadow mode, no policy matched). */
function isAbstainCode(code) {
    return code.startsWith('DAUTH_ABSTAIN_');
}
//# sourceMappingURL=reason-codes.js.map