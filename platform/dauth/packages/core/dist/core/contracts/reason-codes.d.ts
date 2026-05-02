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
export declare const DAUTH_REASON_CODES: {
    readonly ALLOW_ALL_CHECKS_PASSED: "DAUTH_ALLOW_ALL_CHECKS_PASSED";
    readonly ALLOW_SUPER_ADMIN_BYPASS: "DAUTH_ALLOW_SUPER_ADMIN_BYPASS";
    readonly ALLOW_ONBOARDING_BYPASS: "DAUTH_ALLOW_ONBOARDING_BYPASS";
    readonly ALLOW_GRC_FALLBACK: "DAUTH_ALLOW_GRC_FALLBACK";
    readonly ALLOW_DELEGATED: "DAUTH_ALLOW_DELEGATED";
    readonly ALLOW_OWNED: "DAUTH_ALLOW_OWNED";
    readonly DENY_NOT_AUTHENTICATED: "DAUTH_DENY_NOT_AUTHENTICATED";
    readonly DENY_SESSION_INVALID: "DAUTH_DENY_SESSION_INVALID";
    readonly DENY_SESSION_REVOKED: "DAUTH_DENY_SESSION_REVOKED";
    readonly DENY_TOKEN_EXPIRED: "DAUTH_DENY_TOKEN_EXPIRED";
    readonly DENY_TOKEN_SIGNATURE: "DAUTH_DENY_TOKEN_SIGNATURE";
    readonly DENY_TOKEN_ISSUER: "DAUTH_DENY_TOKEN_ISSUER";
    readonly DENY_TENANT_MEMBERSHIP_MISSING: "DAUTH_DENY_TENANT_MEMBERSHIP_MISSING";
    readonly DENY_TENANT_INACTIVE: "DAUTH_DENY_TENANT_INACTIVE";
    readonly DENY_PRODUCT_NOT_ENTITLED: "DAUTH_DENY_PRODUCT_NOT_ENTITLED";
    readonly DENY_MODULE_DISABLED: "DAUTH_DENY_MODULE_DISABLED";
    readonly DENY_ACCESS_PROFILE_BLOCKED: "DAUTH_DENY_ACCESS_PROFILE_BLOCKED";
    readonly DENY_PERMISSION_MISSING: "DAUTH_DENY_PERMISSION_MISSING";
    readonly DENY_SCOPE_MISMATCH: "DAUTH_DENY_SCOPE_MISMATCH";
    readonly DENY_AUTHORITY_INSUFFICIENT: "DAUTH_DENY_AUTHORITY_INSUFFICIENT";
    readonly DENY_SOD_CONFLICT: "DAUTH_DENY_SOD_CONFLICT";
    readonly DENY_SOD_SELF_APPROVAL: "DAUTH_DENY_SOD_SELF_APPROVAL";
    readonly DENY_LIFECYCLE_TRANSITION: "DAUTH_DENY_LIFECYCLE_TRANSITION";
    readonly DENY_OWNERSHIP_MISSING: "DAUTH_DENY_OWNERSHIP_MISSING";
    readonly DENY_DELEGATION_INVALID: "DAUTH_DENY_DELEGATION_INVALID";
    readonly DENY_DELEGATION_EXPIRED: "DAUTH_DENY_DELEGATION_EXPIRED";
    readonly DENY_DELEGATION_OUT_OF_SCOPE: "DAUTH_DENY_DELEGATION_OUT_OF_SCOPE";
    readonly DENY_CERBOS: "DAUTH_DENY_CERBOS";
    readonly DENY_CERBOS_UNAVAILABLE: "DAUTH_DENY_CERBOS_UNAVAILABLE";
    readonly DENY_OPENFGA: "DAUTH_DENY_OPENFGA";
    readonly DENY_OPENFGA_UNAVAILABLE: "DAUTH_DENY_OPENFGA_UNAVAILABLE";
    readonly DENY_KEYCLOAK_UNAVAILABLE: "DAUTH_DENY_KEYCLOAK_UNAVAILABLE";
    readonly DENY_AI_QUOTA_EXCEEDED: "DAUTH_DENY_AI_QUOTA_EXCEEDED";
    readonly DENY_AI_PERMISSION_MISSING: "DAUTH_DENY_AI_PERMISSION_MISSING";
    readonly DENY_AI_DATA_SENSITIVITY: "DAUTH_DENY_AI_DATA_SENSITIVITY";
    readonly DENY_EMAIL_NOT_VERIFIED: "DAUTH_DENY_EMAIL_NOT_VERIFIED";
    readonly DENY_MFA_REQUIRED: "DAUTH_DENY_MFA_REQUIRED";
    readonly DENY_DUAL_APPROVAL_REQUIRED: "DAUTH_DENY_DUAL_APPROVAL_REQUIRED";
    readonly ABSTAIN_NO_POLICY: "DAUTH_ABSTAIN_NO_POLICY";
    readonly ABSTAIN_SHADOW_MODE: "DAUTH_ABSTAIN_SHADOW_MODE";
    readonly INTERNAL_UNKNOWN: "DAUTH_INTERNAL_UNKNOWN";
};
export type DauthReasonCode = (typeof DAUTH_REASON_CODES)[keyof typeof DAUTH_REASON_CODES];
/**
 * Map a 14-step pipeline failure (step number + check name) to a reason code.
 * Called from `access/decision-engine.ts#denyAndLog`.
 */
export declare function reasonCodeForStep(step: number, check: string): DauthReasonCode;
/** True if the code represents an allow (all checks passed or bypass). */
export declare function isAllowCode(code: DauthReasonCode): boolean;
/** True if the code represents a deny (hard refusal). */
export declare function isDenyCode(code: DauthReasonCode): boolean;
/** True if the code represents an abstain (shadow mode, no policy matched). */
export declare function isAbstainCode(code: DauthReasonCode): boolean;
