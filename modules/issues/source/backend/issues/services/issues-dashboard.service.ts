/**
 * IssuesDashboardService -- Enterprise Issues Dashboard
 * =======================================================
 * Aggregates issue tracking statistics by status and priority,
 * resolution metrics, escalation counts, and issue throughput
 * for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped issues tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner issues
 * @module issues
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the issues module. */
export interface IssuesDashboardSummary {
  tenantId: string;
  totalIssues: number;
  openIssues: number;
  inProgressIssues: number;
  resolvedIssues: number;
  closedIssues: number;
  escalatedIssues: number;
  criticalPriority: number;
  highPriority: number;
  mediumPriority: number;
  lowPriority: number;
  avgResolutionDays: number | null;
  overdueIssues: number;
  recentlyCreated: number;
}

// -- Service ------------------------------------------------------------------

export class IssuesDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: issues by status (open,
   * in_progress, resolved, closed), by priority (critical, high, medium,
   * low), escalated count, average resolution time, overdue issues,
   * and recently created (last 30 days).
   */
  async getDashboardSummary(tenantId: string): Promise<IssuesDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'open')::int AS open,
           COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
           COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
           COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
           COUNT(*) FILTER (WHERE is_escalated = true AND status NOT IN ('resolved', 'closed'))::int AS escalated,
           COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical,
           COUNT(*) FILTER (WHERE priority = 'high')::int AS high,
           COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium,
           COUNT(*) FILTER (WHERE priority = 'low')::int AS low,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 86400)
               FILTER (WHERE status IN ('resolved', 'closed') AND resolved_at IS NOT NULL),
             NULL
           )::numeric AS avg_resolution_days,
           COUNT(*) FILTER (
             WHERE status NOT IN ('resolved', 'closed')
               AND due_date IS NOT NULL
               AND due_date < NOW()
           )::int AS overdue,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_created
         FROM "${schema}".issues`,
        [],
      ).catch(() => ({
        rows: [{
          total: 0, open: 0, in_progress: 0, resolved: 0, closed: 0,
          escalated: 0, critical: 0, high: 0, medium: 0, low: 0,
          avg_resolution_days: null, overdue: 0, recently_created: 0,
        }],
      }));

      const row = result.rows[0] ?? {};

      return {
        tenantId,
        totalIssues: parseInt(row.total ?? '0', 10),
        openIssues: parseInt(row.open ?? '0', 10),
        inProgressIssues: parseInt(row.in_progress ?? '0', 10),
        resolvedIssues: parseInt(row.resolved ?? '0', 10),
        closedIssues: parseInt(row.closed ?? '0', 10),
        escalatedIssues: parseInt(row.escalated ?? '0', 10),
        criticalPriority: parseInt(row.critical ?? '0', 10),
        highPriority: parseInt(row.high ?? '0', 10),
        mediumPriority: parseInt(row.medium ?? '0', 10),
        lowPriority: parseInt(row.low ?? '0', 10),
        avgResolutionDays: row.avg_resolution_days != null
          ? Math.round(parseFloat(row.avg_resolution_days) * 100) / 100
          : null,
        overdueIssues: parseInt(row.overdue ?? '0', 10),
        recentlyCreated: parseInt(row.recently_created ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalIssues: 0,
        openIssues: 0,
        inProgressIssues: 0,
        resolvedIssues: 0,
        closedIssues: 0,
        escalatedIssues: 0,
        criticalPriority: 0,
        highPriority: 0,
        mediumPriority: 0,
        lowPriority: 0,
        avgResolutionDays: null,
        overdueIssues: 0,
        recentlyCreated: 0,
      };
    }
  }
}
