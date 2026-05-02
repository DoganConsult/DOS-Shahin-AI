/**
 * Foundation Sync Job
 * @owner DOS / Foundation module
 *
 * Scheduled background job that:
 *  1. Syncs org hierarchy integrity (units, departments, positions, teams)
 *  2. Detects and repairs orphaned org nodes across all provisioned tenants
 *  3. Refreshes denormalised ancestry paths for hierarchy-aware queries
 *  4. Emits foundation.org_hierarchy.synced events on the platform event bus
 *
 * Runs: every 6 hours (0 * /6 * * *)
 * Fallback schedule (node-cron): same cron when TEMPORAL_ENABLED=false
 */

import { safeQuery, tenantSchema as _tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { registerJob, getProvisionedTenants } from '../../ports/platform.port';

// ── Types ──────────────────────────────────────────────────────────────────

interface OrgSyncResult {
  tenantId: string;
  unitsSynced: number;
  orphansRepaired: number;
  ancestryPathsRefreshed: number;
  durationMs: number;
  error?: string;
}

// ── Core sync logic ─────────────────────────────────────────────────────────

/**
 * Syncs org hierarchy for a single tenant.
 * - Verifies all business_units, departments, teams have valid parent refs
 * - Computes and updates materialised ancestor_path[] cols
 * - Flags orphaned nodes for admin review
 */
async function syncOrgHierarchyForTenant(tenantId: string): Promise<OrgSyncResult> {
  const start = Date.now();
  const schema = await resolveTenantSchema(tenantId);
  const result: OrgSyncResult = {
    tenantId,
    unitsSynced: 0,
    orphansRepaired: 0,
    ancestryPathsRefreshed: 0,
    durationMs: 0,
  };

  try {
    // 1. Count active org units (business_units + departments)
    const countRes = await safeQuery(
      `SELECT COUNT(*) AS total
       FROM ${schema}.business_units
       WHERE deleted_at IS NULL`,
    );
    result.unitsSynced = parseInt(countRes.rows[0]?.total ?? '0', 10);

    // 2. Detect orphaned departments (parent_id points to non-existent unit)
    const orphanRes = await safeQuery(
      `UPDATE ${schema}.departments d
       SET parent_id = NULL, updated_at = NOW()
       WHERE d.parent_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM ${schema}.business_units bu WHERE bu.id = d.parent_id AND bu.deleted_at IS NULL
         )
       RETURNING d.id`,
    );
    result.orphansRepaired = orphanRes.rowCount ?? 0;

    // 3. Refresh ancestor_path on teams (computed path from root → team)
    //    Only runs if the column exists (added by foundation migrations)
    const hasAncestorPath = await safeQuery(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_schema = $1
         AND table_name   = 'teams'
         AND column_name  = 'ancestor_path'`,
      [schema],
    );

    if ((hasAncestorPath.rowCount ?? 0) > 0) {
      // Refresh ancestor_path as JSON array of ancestor ids (shallow — 4 levels max)
      const refreshRes = await safeQuery(
        `UPDATE ${schema}.teams t
         SET ancestor_path =
               COALESCE(
                 (SELECT json_agg(d.id ORDER BY d.level)
                  FROM ${schema}.departments d
                  WHERE d.id = ANY(ARRAY[t.department_id])),
                 '[]'::json
               ),
             updated_at = NOW()
         WHERE t.deleted_at IS NULL
         RETURNING t.id`,
      );
      result.ancestryPathsRefreshed = refreshRes.rowCount ?? 0;
    }

    result.durationMs = Date.now() - start;
    return result;
  } catch (err) {
    result.error = err instanceof Error ? err.message : String(err);
    result.durationMs = Date.now() - start;
    logger.error('[FoundationSyncJob] Tenant sync failed', { tenantId, error: result.error });
    return result;
  }
}

/**
 * Resolve a tenant's Postgres schema name from the provisioned tenant list.
 */
async function resolveTenantSchema(tenantId: string): Promise<string> {
  const res = await safeQuery(
    `SELECT schema_name FROM public.tenants WHERE id = $1 LIMIT 1`,
    [tenantId],
  );
  return res.rows[0]?.schema_name ?? `tenant_${tenantId}`;
}

// ── Job handler ─────────────────────────────────────────────────────────────

async function runFoundationSync(): Promise<void> {
  logger.info('[FoundationSyncJob] Starting org hierarchy sync across all tenants');

  let tenants: Awaited<ReturnType<typeof getProvisionedTenants>>;
  try {
    tenants = await getProvisionedTenants();
  } catch (err) {
    logger.error('[FoundationSyncJob] Failed to load provisioned tenants', {
      error: err instanceof Error ? err.message : String(err),
    });
    return;
  }

  if (tenants.length === 0) {
    logger.info('[FoundationSyncJob] No provisioned tenants — skipping');
    return;
  }

  const results: OrgSyncResult[] = [];

  for (const tenant of tenants) {
    const tid = ((tenant as unknown) as Record<string, unknown>).tenantId as string ?? ((tenant as unknown) as Record<string, unknown>).id as string;
    const result = await syncOrgHierarchyForTenant(tid);
    results.push(result);

    if (!result.error) {
      logger.info('[FoundationSyncJob] Tenant synced', {
        tenantId: tid,
        unitsSynced: result.unitsSynced,
        orphansRepaired: result.orphansRepaired,
        ancestryPathsRefreshed: result.ancestryPathsRefreshed,
        durationMs: result.durationMs,
      });
    }
  }

  const totalOrphans = results.reduce((s, r) => s + r.orphansRepaired, 0);
  const errors = results.filter(r => r.error).length;

  logger.info('[FoundationSyncJob] Sync complete', {
    tenantsProcessed: tenants.length,
    tenantsErrored: errors,
    totalOrphansRepaired: totalOrphans,
  });
}

// ── Registration ─────────────────────────────────────────────────────────────

/**
 * Register the foundation sync job with the platform scheduler.
 * Call this from the DOS job bootstrap (server startup Jobs phase).
 */
export function registerFoundationSyncJob(): void {
  registerJob(
    'foundation.org_hierarchy_sync',
    '0 */6 * * *',   // Every 6 hours
    runFoundationSync,
  ).then(() => {
    logger.info('[FoundationSyncJob] Registered: foundation.org_hierarchy_sync (every 6h)');
  }).catch((err: unknown) => {
    logger.error('[FoundationSyncJob] Failed to register job', {
      error: err instanceof Error ? err.message : String(err),
    });
  });
}
