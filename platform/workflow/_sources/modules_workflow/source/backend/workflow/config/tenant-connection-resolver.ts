import { closeAllServicePools, createServicePool, type Pool, type ServicePoolConfig } from '@dos/db';

class TenantConnectionResolver {
  private readonly pools = new Map<string, Pool>();

  get(tenantId: string, config?: ServicePoolConfig): Pool {
    const existing = this.pools.get(tenantId);
    if (existing) return existing;
    const pool = createServicePool(`workflow-tenant-${tenantId}`, config ?? {});
    this.pools.set(tenantId, pool);
    return pool;
  }

  evict(tenantId: string): void {
    this.pools.delete(tenantId);
  }

  async shutdown(): Promise<void> {
    this.pools.clear();
    await closeAllServicePools();
  }
}

export const tenantConnectionResolver = new TenantConnectionResolver();
export type { TenantConnectionResolver };
