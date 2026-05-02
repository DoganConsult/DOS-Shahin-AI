/**
 * ReportingDashboardService -- Enterprise Reporting Dashboard
 * =============================================================
 * Aggregates report counts by status (draft, published, archived),
 * generation trends, and overall reporting health for operational
 * dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped reporting tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner reporting
 * @module reporting
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the reporting module. */
export interface ReportingDashboardSummary {
  tenantId: string;
  totalReports: number;
  draftReports: number;
  publishedReports: number;
  archivedReports: number;
  scheduledReports: number;
  recentlyPublished: number;
  avgGenerationTimeSec: number | null;
}

// -- Service ------------------------------------------------------------------

export class ReportingDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: reports by status
   * (draft, published, archived), scheduled report count, recently
   * published (last 30 days), and average generation time.
   */
  async getDashboardSummary(tenantId: string): Promise<ReportingDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'published')::int AS published,
           COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
           COUNT(*) FILTER (WHERE is_scheduled = true AND status != 'archived')::int AS scheduled,
           COUNT(*) FILTER (
             WHERE status = 'published'
               AND published_at >= NOW() - INTERVAL '30 days'
           )::int AS recently_published,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (generated_at - requested_at)))
               FILTER (WHERE generated_at IS NOT NULL AND requested_at IS NOT NULL),
             NULL
           )::numeric AS avg_gen_time_sec
         FROM "${schema}".reports`,
        [],
      ).catch(() => ({
        rows: [{
          total: 0, draft: 0, published: 0, archived: 0,
          scheduled: 0, recently_published: 0, avg_gen_time_sec: null,
        }],
      }));

      const row = result.rows[0] ?? {};

      return {
        tenantId,
        totalReports: parseInt(row.total ?? '0', 10),
        draftReports: parseInt(row.draft ?? '0', 10),
        publishedReports: parseInt(row.published ?? '0', 10),
        archivedReports: parseInt(row.archived ?? '0', 10),
        scheduledReports: parseInt(row.scheduled ?? '0', 10),
        recentlyPublished: parseInt(row.recently_published ?? '0', 10),
        avgGenerationTimeSec: row.avg_gen_time_sec != null
          ? Math.round(parseFloat(row.avg_gen_time_sec) * 100) / 100
          : null,
      };
    } catch {
      return {
        tenantId,
        totalReports: 0,
        draftReports: 0,
        publishedReports: 0,
        archivedReports: 0,
        scheduledReports: 0,
        recentlyPublished: 0,
        avgGenerationTimeSec: null,
      };
    }
  }
}
