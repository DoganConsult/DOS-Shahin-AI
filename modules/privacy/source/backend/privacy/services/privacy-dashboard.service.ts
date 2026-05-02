/**
 * PrivacyDashboardService -- Enterprise Privacy Dashboard
 * =========================================================
 * Aggregates privacy impact assessments, data subject access
 * requests (DSARs) by status, consent metrics, and privacy
 * compliance health for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped privacy tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner privacy
 * @module privacy
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the privacy module. */
export interface PrivacyDashboardSummary {
  tenantId: string;
  totalAssessments: number;
  completedAssessments: number;
  inProgressAssessments: number;
  highRiskAssessments: number;
  totalDsars: number;
  openDsars: number;
  completedDsars: number;
  overdueDsars: number;
  avgDsarResolutionDays: number | null;
  dsarComplianceRate: number;
  activeBreaches: number;
}

// -- Service ------------------------------------------------------------------

export class PrivacyDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: privacy impact assessments
   * by status (completed, in_progress, high_risk), DSARs by status
   * (open, completed, overdue), average DSAR resolution time, DSAR
   * compliance rate, and active breach count.
   */
  async getDashboardSummary(tenantId: string): Promise<PrivacyDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      // Privacy Impact Assessment (PIA) aggregates
      const piaResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
           COUNT(*) FILTER (WHERE risk_level = 'high')::int AS high_risk
         FROM "${schema}".privacy_assessments`,
        [],
      ).catch(() => ({
        rows: [{ total: 0, completed: 0, in_progress: 0, high_risk: 0 }],
      }));

      const piaRow = piaResult.rows[0] ?? {};

      // DSAR aggregates
      const dsarResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'open')::int AS open,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (
             WHERE status != 'completed'
               AND due_date IS NOT NULL
               AND due_date < NOW()
           )::int AS overdue,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (completed_at - created_at)) / 86400)
               FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL),
             NULL
           )::numeric AS avg_resolution_days
         FROM "${schema}".privacy_dsars`,
        [],
      ).catch(() => ({
        rows: [{ total: 0, open: 0, completed: 0, overdue: 0, avg_resolution_days: null }],
      }));

      const dsarRow = dsarResult.rows[0] ?? {};
      const dsarTotal = parseInt(dsarRow.total ?? '0', 10);
      const dsarCompleted = parseInt(dsarRow.completed ?? '0', 10);
      const dsarOverdue = parseInt(dsarRow.overdue ?? '0', 10);

      // Active breach count
      const breachResult = await safeQuery(
        `SELECT COUNT(*)::int AS active_breaches
         FROM "${schema}".privacy_breaches
         WHERE status IN ('open', 'investigating', 'notifying')`,
        [],
      ).catch(() => ({ rows: [{ active_breaches: 0 }] }));

      const activeBreaches = parseInt(breachResult.rows[0]?.active_breaches ?? '0', 10);

      // DSAR compliance: completed on time / total (excluding still-open)
      const closedDsars = dsarCompleted + dsarOverdue;
      const dsarComplianceRate = closedDsars > 0
        ? Math.round((dsarCompleted / closedDsars) * 10000) / 100
        : 100;

      return {
        tenantId,
        totalAssessments: parseInt(piaRow.total ?? '0', 10),
        completedAssessments: parseInt(piaRow.completed ?? '0', 10),
        inProgressAssessments: parseInt(piaRow.in_progress ?? '0', 10),
        highRiskAssessments: parseInt(piaRow.high_risk ?? '0', 10),
        totalDsars: dsarTotal,
        openDsars: parseInt(dsarRow.open ?? '0', 10),
        completedDsars: dsarCompleted,
        overdueDsars: dsarOverdue,
        avgDsarResolutionDays: dsarRow.avg_resolution_days != null
          ? Math.round(parseFloat(dsarRow.avg_resolution_days) * 100) / 100
          : null,
        dsarComplianceRate,
        activeBreaches,
      };
    } catch {
      return {
        tenantId,
        totalAssessments: 0,
        completedAssessments: 0,
        inProgressAssessments: 0,
        highRiskAssessments: 0,
        totalDsars: 0,
        openDsars: 0,
        completedDsars: 0,
        overdueDsars: 0,
        avgDsarResolutionDays: null,
        dsarComplianceRate: 100,
        activeBreaches: 0,
      };
    }
  }
}
