/**
 * BcpDashboardService -- Enterprise BCP Dashboard
 * ==================================================
 * Aggregates business continuity plan health, exercise results,
 * plan status distribution, and recovery readiness for operational
 * dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped BCP tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner bcp
 * @module bcp
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for the BCP module. */
export interface BcpDashboardSummary {
  tenantId: string;
  totalPlans: number;
  activePlans: number;
  draftPlans: number;
  archivedPlans: number;
  expiredPlans: number;
  totalExercises: number;
  completedExercises: number;
  scheduledExercises: number;
  failedExercises: number;
  avgRecoveryTimeHrs: number | null;
  plansDueForReview: number;
}

// -- Service ------------------------------------------------------------------

export class BcpDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: plans by status (active, draft,
   * archived, expired), exercises by status (completed, scheduled, failed),
   * average recovery time, and plans due for review within 30 days.
   */
  async getDashboardSummary(tenantId: string): Promise<BcpDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      // Plan aggregates
      const planResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'active')::int AS active,
           COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
           COUNT(*) FILTER (WHERE status = 'archived')::int AS archived,
           COUNT(*) FILTER (WHERE status = 'expired')::int AS expired,
           COUNT(*) FILTER (
             WHERE next_review_date IS NOT NULL
               AND next_review_date <= NOW() + INTERVAL '30 days'
               AND status = 'active'
           )::int AS due_for_review
         FROM "${schema}".bcp_plans`,
        [],
      ).catch(() => ({
        rows: [{ total: 0, active: 0, draft: 0, archived: 0, expired: 0, due_for_review: 0 }],
      }));

      const pRow = planResult.rows[0] ?? {};

      // Exercise aggregates
      const exerciseResult = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (WHERE status = 'scheduled')::int AS scheduled,
           COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) / 3600)
               FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL AND started_at IS NOT NULL),
             NULL
           )::numeric AS avg_recovery_hrs
         FROM "${schema}".bcp_exercises`,
        [],
      ).catch(() => ({
        rows: [{ total: 0, completed: 0, scheduled: 0, failed: 0, avg_recovery_hrs: null }],
      }));

      const eRow = exerciseResult.rows[0] ?? {};

      return {
        tenantId,
        totalPlans: parseInt(pRow.total ?? '0', 10),
        activePlans: parseInt(pRow.active ?? '0', 10),
        draftPlans: parseInt(pRow.draft ?? '0', 10),
        archivedPlans: parseInt(pRow.archived ?? '0', 10),
        expiredPlans: parseInt(pRow.expired ?? '0', 10),
        totalExercises: parseInt(eRow.total ?? '0', 10),
        completedExercises: parseInt(eRow.completed ?? '0', 10),
        scheduledExercises: parseInt(eRow.scheduled ?? '0', 10),
        failedExercises: parseInt(eRow.failed ?? '0', 10),
        avgRecoveryTimeHrs: eRow.avg_recovery_hrs != null
          ? Math.round(parseFloat(eRow.avg_recovery_hrs) * 100) / 100
          : null,
        plansDueForReview: parseInt(pRow.due_for_review ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalPlans: 0,
        activePlans: 0,
        draftPlans: 0,
        archivedPlans: 0,
        expiredPlans: 0,
        totalExercises: 0,
        completedExercises: 0,
        scheduledExercises: 0,
        failedExercises: 0,
        avgRecoveryTimeHrs: null,
        plansDueForReview: 0,
      };
    }
  }
}
