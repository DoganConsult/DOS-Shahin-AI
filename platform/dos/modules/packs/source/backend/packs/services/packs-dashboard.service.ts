/**
 * PacksDashboardService -- Enterprise Packs Dashboard
 * =====================================================
 * Aggregates pack registry statistics by status (installed,
 * available, failed), installation trends, and pack health
 * for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped packs tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner packs
 * @module packs
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the packs module. */
export interface PacksDashboardSummary {
  tenantId: string;
  totalPacks: number;
  installedPacks: number;
  availablePacks: number;
  failedPacks: number;
  deprecatedPacks: number;
  pendingUpdatePacks: number;
  installSuccessRate: number;
  lastInstallAt: string | null;
  recentlyInstalled: number;
}

// -- Service ------------------------------------------------------------------

export class PacksDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: packs by status (installed,
   * available, failed, deprecated), pending updates, install success rate,
   * last installation timestamp, and recently installed (last 30 days).
   */
  async getDashboardSummary(tenantId: string): Promise<PacksDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'installed')::int AS installed,
           COUNT(*) FILTER (WHERE status = 'available')::int AS available,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
           COUNT(*) FILTER (
             WHERE status = 'installed'
               AND has_update = true
           )::int AS pending_update,
           MAX(installed_at) FILTER (WHERE status = 'installed') AS last_install_at,
           COUNT(*) FILTER (
             WHERE status = 'installed'
               AND installed_at >= NOW() - INTERVAL '30 days'
           )::int AS recently_installed
         FROM "${schema}".packs_registry`,
        [],
      ).catch(() => ({
        rows: [{
          total: 0, installed: 0, available: 0, failed: 0,
          deprecated: 0, pending_update: 0, last_install_at: null,
          recently_installed: 0,
        }],
      }));

      const row = result.rows[0] ?? {};
      const installed = parseInt(row.installed ?? '0', 10);
      const failed = parseInt(row.failed ?? '0', 10);
      const attempted = installed + failed;

      return {
        tenantId,
        totalPacks: parseInt(row.total ?? '0', 10),
        installedPacks: installed,
        availablePacks: parseInt(row.available ?? '0', 10),
        failedPacks: failed,
        deprecatedPacks: parseInt(row.deprecated ?? '0', 10),
        pendingUpdatePacks: parseInt(row.pending_update ?? '0', 10),
        installSuccessRate: attempted > 0
          ? Math.round((installed / attempted) * 10000) / 100
          : 0,
        lastInstallAt: row.last_install_at ?? null,
        recentlyInstalled: parseInt(row.recently_installed ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalPacks: 0,
        installedPacks: 0,
        availablePacks: 0,
        failedPacks: 0,
        deprecatedPacks: 0,
        pendingUpdatePacks: 0,
        installSuccessRate: 0,
        lastInstallAt: null,
        recentlyInstalled: 0,
      };
    }
  }
}
