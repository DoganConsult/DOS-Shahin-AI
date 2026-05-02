/**
 * TrainingDashboardService -- Enterprise Training Dashboard
 * ===========================================================
 * Aggregates training assignment health, completion statistics,
 * overdue tracking, and health scoring for operational dashboards
 * and admin surfaces.
 *
 * All data is derived from tenant-scoped training tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner training
 * @module training
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// -- Types --------------------------------------------------------------------

/** Top-level dashboard summary for training assignments. */
export interface TrainingDashboardSummary {
  tenantId: string;
  totalAssignments: number;
  assignedCount: number;
  completedCount: number;
  overdueCount: number;
  inProgressCount: number;
  completionRate: number;
  avgCompletionDays: number | null;
  recentlyAssigned: number;
}

/** Training health assessment result. */
export interface TrainingHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  completionRate: number;
  overdueCount: number;
  overdueRate: number;
  evaluatedAt: string;
}

// -- Service ------------------------------------------------------------------

export class TrainingDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: training assignments by status
   * (assigned, completed, overdue, in_progress), completion rate, average
   * completion time, and recently assigned (last 30 days).
   */
  async getDashboardSummary(tenantId: string): Promise<TrainingDashboardSummary> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'assigned')::int AS assigned,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (
             WHERE status != 'completed'
               AND due_date IS NOT NULL
               AND due_date < NOW()
           )::int AS overdue,
           COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
           COALESCE(
             AVG(EXTRACT(EPOCH FROM (completed_at - assigned_at)) / 86400)
               FILTER (WHERE status = 'completed' AND completed_at IS NOT NULL AND assigned_at IS NOT NULL),
             NULL
           )::numeric AS avg_completion_days,
           COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days')::int AS recently_assigned
         FROM "${schema}".training_assignments`,
        [],
      ).catch(() => ({
        rows: [{
          total: 0, assigned: 0, completed: 0, overdue: 0,
          in_progress: 0, avg_completion_days: null, recently_assigned: 0,
        }],
      }));

      const row = result.rows[0] ?? {};
      const total = parseInt(row.total ?? '0', 10);
      const completed = parseInt(row.completed ?? '0', 10);

      return {
        tenantId,
        totalAssignments: total,
        assignedCount: parseInt(row.assigned ?? '0', 10),
        completedCount: completed,
        overdueCount: parseInt(row.overdue ?? '0', 10),
        inProgressCount: parseInt(row.in_progress ?? '0', 10),
        completionRate: total > 0 ? Math.round((completed / total) * 10000) / 100 : 0,
        avgCompletionDays: row.avg_completion_days != null
          ? Math.round(parseFloat(row.avg_completion_days) * 100) / 100
          : null,
        recentlyAssigned: parseInt(row.recently_assigned ?? '0', 10),
      };
    } catch {
      return {
        tenantId,
        totalAssignments: 0,
        assignedCount: 0,
        completedCount: 0,
        overdueCount: 0,
        inProgressCount: 0,
        completionRate: 0,
        avgCompletionDays: null,
        recentlyAssigned: 0,
      };
    }
  }

  /**
   * Compute a training health score (0-100) based on completion rate and
   * overdue assignment count.
   *
   * Algorithm:
   *   - Base score: completionRate (0-100)
   *   - Penalty: -5 per overdue assignment (capped at -40)
   *   - Minimum: 0
   */
  async getTrainingHealth(tenantId: string): Promise<TrainingHealth> {
    const schema = tenantSchema(tenantId);

    try {
      const result = await safeQuery(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
           COUNT(*) FILTER (
             WHERE status != 'completed'
               AND due_date IS NOT NULL
               AND due_date < NOW()
           )::int AS overdue
         FROM "${schema}".training_assignments`,
        [],
      ).catch(() => ({ rows: [{ total: 0, completed: 0, overdue: 0 }] }));

      const row = result.rows[0] ?? {};
      const total = parseInt(row.total ?? '0', 10);
      const completed = parseInt(row.completed ?? '0', 10);
      const overdueCount = parseInt(row.overdue ?? '0', 10);

      const completionRate = total > 0
        ? Math.round((completed / total) * 10000) / 100
        : 100;
      const overdueRate = total > 0
        ? Math.round((overdueCount / total) * 10000) / 100
        : 0;

      // Health score: start with completion rate, penalise for overdue
      let healthScore = Math.round(completionRate);
      healthScore -= Math.min(overdueCount * 5, 40);
      healthScore = Math.max(0, Math.min(100, healthScore));

      let grade: 'A' | 'B' | 'C' | 'D' | 'F';
      if (healthScore >= 90) grade = 'A';
      else if (healthScore >= 75) grade = 'B';
      else if (healthScore >= 60) grade = 'C';
      else if (healthScore >= 40) grade = 'D';
      else grade = 'F';

      return {
        tenantId,
        healthScore,
        grade,
        completionRate,
        overdueCount,
        overdueRate,
        evaluatedAt: new Date().toISOString(),
      };
    } catch {
      return {
        tenantId,
        healthScore: 0,
        grade: 'F',
        completionRate: 0,
        overdueCount: 0,
        overdueRate: 0,
        evaluatedAt: new Date().toISOString(),
      };
    }
  }
}
