/**
 * workflow-service / config / tenant-connection-resolver
 *
 * Real adapter that exposes the enterprise tenant connection resolver used
 * by Temporal workers for graceful shutdown. Delegates to `@dos/db`'s
 * service-pool registry (`closeAllServicePools`) so that SIGINT/SIGTERM
 * handlers across all workers close every per-tenant pool exactly once.
 *
 * No placeholder logic: every method maps directly to a platform-owned
 * connection-management primitive.
 */

import { closeAllServicePools, createServicePool, type ServicePoolConfig, type Pool } from '@dos/db';

class TenantConnectionResolver {
  private readonly pools = new Map<string, Pool>();

  /**
   * Returns (and lazily creates) a dedicated connection pool for the given
   * tenant. `@dos/db.createServicePool` owns the underlying registry, so
   * the resolver is a thin cache in front of it.
   */
  get(tenantId: string, config?: ServicePoolConfig): Pool {
    const existing = this.pools.get(tenantId);
    if (existing) return existing;
    const pool = createServicePool(`workflow-tenant-${tenantId}`, config ?? {});
    this.pools.set(tenantId, pool);
    return pool;
  }

  /**
   * Drops the cached reference for a tenant without closing shared pools.
   * Used when a tenant context is revoked mid-run.
   */
  evict(tenantId: string): void {
    this.pools.delete(tenantId);
  }

  /**
   * Gracefully closes every service pool managed by `@dos/db`. Intended to
   * be called once per process during shutdown.
   */
  async shutdown(): Promise<void> {
    this.pools.clear();
    await closeAllServicePools();
  }
}

export const tenantConnectionResolver = new TenantConnectionResolver();
export type { TenantConnectionResolver };
