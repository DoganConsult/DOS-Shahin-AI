import type { CsrfPolicyConfig } from './csrf-policy.contracts';
/** Read per-tenant CSRF policy. Falls back to defaults if none configured. */
export declare function getCsrfPolicy(tenantId: string): Promise<CsrfPolicyConfig>;
/** Upsert per-tenant CSRF policy. Publishes event on change. */
export declare function updateCsrfPolicy(tenantId: string, patch: Partial<CsrfPolicyConfig>, updatedBy: string): Promise<CsrfPolicyConfig>;
/** Return defaults for tenants without custom policy. */
export declare function getCsrfPolicyDefaults(): CsrfPolicyConfig;
