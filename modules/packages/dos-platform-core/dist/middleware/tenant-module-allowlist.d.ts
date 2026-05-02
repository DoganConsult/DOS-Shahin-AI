/**
 * Tenant module allowlist middleware — caches per-tenant module entitlements
 * and provides cache invalidation on module state changes.
 */
/**
 * Invalidate the cached module allowlist for a tenant.
 * Called after module state changes (enable/disable/trial).
 */
export declare function invalidateTenantAllowlist(tenantId: string): void;
/**
 * Get the set of enabled module codes for a tenant.
 * Returns from cache if available and not expired.
 */
export declare function getTenantAllowlist(tenantId: string): Promise<Set<string>>;
