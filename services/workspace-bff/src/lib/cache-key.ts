import { createHash } from 'node:crypto';

/**
 * Cache key per Doctrine Article 2 — `(tenantId, roleSetHash, uiCatalogVersion)`.
 * Backed by `dos.mv_workspace_bootstrap` materialized view (M4 migration).
 */
export interface BootstrapCacheKey {
  tenantId: string;
  roleSetHash: string;
  uiCatalogVersion: string;
}

export function roleSetHash(roles: readonly string[]): string {
  const sorted = [...roles].map((r) => r.toLowerCase().trim()).sort().join('|');
  return createHash('sha256').update(sorted).digest('hex').slice(0, 16);
}

export function cacheKeyOf(k: BootstrapCacheKey): string {
  return `wsb:${k.tenantId}:${k.roleSetHash}:${k.uiCatalogVersion}`;
}
