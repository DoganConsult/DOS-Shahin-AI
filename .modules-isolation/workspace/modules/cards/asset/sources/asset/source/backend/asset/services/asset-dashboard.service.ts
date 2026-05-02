/**
 * AssetDashboardService -- Enterprise Asset Dashboard
 * =====================================================
 * Aggregates asset inventory statistics by classification and status,
 * criticality distribution, and lifecycle health for operational
 * dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped asset tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner asset
 * @module asset
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the asset module. */
export interface AssetDashboardSummary {
  tenantId: string;
  totalAssets: number;
  activeAssets: number;
  decommissionedAssets: number;
  pendingReviewAssets: number;
  byClassification: AssetClassificationCount[];
  criticalAssets: number;
  highAssets: number;
  mediumAssets: number;
  lowAssets: number;
  unclassifiedAssets: number;
  recentlyAdded: number;
}

/** Asset count grouped by classification label. */
export interface AssetClassificationCount {
  classification: string;
  count: number;
}

// -- Service ------------------------------------------------------------------

export class AssetDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: assets by status
   * (active, decommissioned, pending_review), by classification label,
   * by criticality level, and recently added (last 30 days).
   */
  async getDashboardSummary(tenantId: string): Promise<AssetDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      // Status and criticality aggregates
      const aggResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'decommissioned')::int AS decommissioned,
           COUNT(*) FILTER (WHERE status = 'pending_review')::int AS pending_review,
           COUNT(*) FILTER (WHERE criticality = 'critical')::int AS critical,
           COUNT(*) FILTER (WHERE criticality = 'high')::int AS high,
           COUNT(*) FILTER (WHERE criticality = 'medium')::int AS medium,
           COUNT(*) FILTER (WHERE criticality = 'low')::int AS low,
           COUNT(*) FILTER (WHERE criticality IS NULL OR criticality = 'unclassified')::int AS unclassified,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_added
         FROM "${schema}".assets`,
        [],
      ).catch(() => ({
        rows: [{
          total: 0, active: 0, decommissioned: 0, pending_review: 0,
          critical: 0, high: 0, medium: 0, low: 0, unclassified: 0,
          recently_added: 0,
        }],
      }));

      const agg = aggResult.rows[0] ?? {};

      // Classification breakdown
      const classResult = await safeQuery(
        `SELECT
           COALESCE(classification, 'unclassified') AS classification,
           COUNT(*)::int AS count
         FROM "${schema}".assets
         WHERE status != 'decommissioned'
         GROUP BY classification
         ORDER BY count DESC`,
        [],
      ).catch(() => ({ rows: [] }));

      const byClassification: AssetClassificationCount[] =
        (classResult.rows as Record<string, unknown>[]).map((r) => ({
          classification: r.classification,
          count: parseInt((r as any).count ?? '0', 10),
        }));

      return {
        tenantId,
        totalAssets: parseInt(agg.total ?? '0', 10),
        activeAssets: parseInt(agg.active ?? '0', 10),
        decommissionedAssets: parseInt(agg.decommissioned ?? '0', 10),
        pendingReviewAssets: parseInt(agg.pending_review ?? '0', 10),
        byClassification,
        criticalAssets: parseInt(agg.critical ?? '0', 10),
        highAssets: parseInt(agg.high ?? '0', 10),
        mediumAssets: parseInt(agg.medium ?? '0', 10),
        lowAssets: parseInt(agg.low ?? '0', 10),
        unclassifiedAssets: parseInt(agg.unclassified ?? '0', 10),
        recentlyAdded: parseInt(agg.recently_added ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalAssets: 0,
        activeAssets: 0,
        decommissionedAssets: 0,
        pendingReviewAssets: 0,
        byClassification: [],
        criticalAssets: 0,
        highAssets: 0,
        mediumAssets: 0,
        lowAssets: 0,
        unclassifiedAssets: 0,
        recentlyAdded: 0,
      };
    }
  }
}
