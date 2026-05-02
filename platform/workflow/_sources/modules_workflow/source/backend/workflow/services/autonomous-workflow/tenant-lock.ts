import { safeQuery } from "@dos/db";

// ============================================================
// Shahin — Autonomous Workflow: Tenant Lock
// Distributed lock for autonomous workflow execution.
// Uses Redis when available for cross-process safety;
// falls back to in-process Set.
// Law 8 (Tenant Isolation).
// ============================================================

/** In-process fallback set for tenant lock when Redis is unavailable. */
const localProcessingTenants = new Set<string>();

/** Regex for validating tenant IDs. */
export const TENANT_ID_RE = /^[a-f0-9-]{8,64}$/i;

/**
 * Acquire a distributed lock for the given tenant.
 * Returns true if the lock was successfully acquired.
 */
export async function acquireTenantLock(tenantId: string): Promise<boolean> {
  try {
    const { getRedis, redisConnected } = await import('../../../../config/redis.js');
    if (redisConnected()) {
      const redis = getRedis();
      const result = await redis.set(
        `autonomous:lock:${tenantId}`,
        String(process.pid),
        'EX', 300, 'NX',
      );
      return result === 'OK';
    }
  } catch { /* fall through to local */ }
  if (localProcessingTenants.has(tenantId)) return false;
  localProcessingTenants.add(tenantId);
  return true;
}

/**
 * Release the distributed lock for the given tenant.
 */
export async function releaseTenantLock(tenantId: string): Promise<void> {
  try {
    const { getRedis, redisConnected } = await import('../../../../config/redis.js');
    if (redisConnected()) {
      const redis = getRedis();
      await redis.del(`autonomous:lock:${tenantId}`);
      return;
    }
  } catch { /* fall through */ }
  localProcessingTenants.delete(tenantId);
}
