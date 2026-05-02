/**
 * Tenant module allowlist middleware — caches per-tenant module entitlements
 * and provides cache invalidation on module state changes.
 */

const tenantAllowlistCache = new Map<string, { modules: Set<string>; cachedAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Invalidate the cached module allowlist for a tenant.
 * Called after module state changes (enable/disable/trial).
 */
export function invalidateTenantAllowlist(tenantId: string): void {
  tenantAllowlistCache.delete(tenantId);
}

/**
 * Get the set of enabled module codes for a tenant.
 * Returns from cache if available and not expired.
 */
export async function getTenantAllowlist(tenantId: string): Promise<Set<string>> {
  const cached = tenantAllowlistCache.get(tenantId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.modules;
  }

  try {
    const { safeQuery } = await import('@dos/db');
    const res = await safeQuery(
      `SELECT module_code FROM public.tenant_module_states
       WHERE tenant_id = $1 AND state IN ('on', 'trial')`,
      [tenantId]
    );
    const modules = new Set<string>(res.rows.map(( r: Record<string, any>) => r.module_code as string));
    tenantAllowlistCache.set(tenantId, { modules, cachedAt: Date.now() });
    return modules;
  } catch {
    return new Set<string>();
  }
}
