import { masterQuery } from '@dos/db/master';

/**
 * Cache-key-aware reader for `dos.mv_workspace_bootstrap`.
 *
 * M4 D2: the materialized view is currently keyed on
 * `(tenant_id, ui_catalog_version)` only. Per-roleSetHash cuts land in
 * M5 when the role-extension columns + per-role refresh trigger ship.
 * Until then, the BFF projects the same MV row through the cache key
 * and lets the JWE sit on top.
 */
export interface BootstrapMvRow {
  tenant_id: string;
  ui_catalog_version: string;
  routes: unknown[];
  shell: unknown[];
  components: unknown[];
  refreshed_at: string;
}

export async function readBootstrapMv(
  tenantId: string,
  uiCatalogVersion = 'v1',
): Promise<BootstrapMvRow | null> {
  const r = await masterQuery(
    `SELECT tenant_id, ui_catalog_version, routes, shell, components, refreshed_at
       FROM dos.mv_workspace_bootstrap
      WHERE tenant_id = $1 AND ui_catalog_version = $2
      LIMIT 1`,
    [tenantId, uiCatalogVersion],
  );
  if (!r.rows.length) return null;
  const row = r.rows[0] as Record<string, unknown>;
  return {
    tenant_id: String(row.tenant_id),
    ui_catalog_version: String(row.ui_catalog_version),
    routes: (row.routes as unknown[]) ?? [],
    shell: (row.shell as unknown[]) ?? [],
    components: (row.components as unknown[]) ?? [],
    refreshed_at: String(row.refreshed_at),
  };
}

/**
 * Refresh the MV concurrently. Caller must already be authorized via
 * `dos.actor='dos-master'`. Used by M5 SSE channel on bootstrap-invalidate.
 */
export async function refreshBootstrapMv(): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
  await masterQuery(`REFRESH MATERIALIZED VIEW CONCURRENTLY dos.mv_workspace_bootstrap`);
}

/**
 * Insert an invalidation record. Triggers the M5 SSE fan-out.
 */
export async function logInvalidation(
  scope: 'tenant' | 'role' | 'module' | 'permission' | 'global',
  scopeKey: string | null,
  reason: string,
  cacheVersion: string,
): Promise<void> {
  await masterQuery(`SET dos.actor = 'dos-master'`);
  await masterQuery(
    `INSERT INTO dos.dos_master_invalidation_log
        (scope, scope_key, reason, cache_version, fan_out_count)
      VALUES ($1, $2, $3, $4, 0)`,
    [scope, scopeKey, reason, cacheVersion],
  );
}
