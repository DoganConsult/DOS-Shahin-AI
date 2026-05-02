/**
 * RemediationDashboardService -- Enterprise Remediation Dashboard
 * ====================================================
 * Aggregates remediation health, trend data, task status distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped remediation tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner remediation
 * @module remediation
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Remediation task status breakdown counts. */
export interface RemediationStatusCounts {
  open: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

/** Top-level dashboard summary. */
export interface RemediationDashboardSummary {
  tenantId: string;
  totalTasks: number;
  byStatus: RemediationStatusCounts;
  completionRate: number;
}

/** Health score result. */
export interface RemediationHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  overdueTasks: number;
  completionRate: number;
  evaluatedAt: string;
}

/** Daily trend data point. */
export interface RemediationTrendDataPoint {
  date: string;
  tasksCreated: number;
  tasksCompleted: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class RemediationDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: total remediation tasks
   * by status (open/in_progress/completed/overdue) and completion rate.
   */
  async getDashboardSummary(tenantId: string): Promise<RemediationDashboardSummary> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'closed')
             AND due_date IS NOT NULL
             AND due_date < NOW()
         )::int AS overdue
       FROM "${schema}".remediation_tasks`,
    ).catch(() => ({
      rows: [{ total: 0, open: 0, in_progress: 0, completed: 0, overdue: 0 }],
    }));

    const r = rows[0] ?? {};
    const total = parseInt(r.total ?? '0', 10);
    const completed = parseInt(r.completed ?? '0', 10);
    const completionRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;

    return {
      tenantId,
      totalTasks: total,
      byStatus: {
        open: parseInt(r.open ?? '0', 10),
        in_progress: parseInt(r.in_progress ?? '0', 10),
        completed,
        overdue: parseInt(r.overdue ?? '0', 10),
      },
      completionRate,
    };
  }

  /**
   * Compute a health score (0-100) based on remediation posture.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -10 per overdue task (capped at -50)
   *   - Penalty: completion rate below 50% costs -30, below 75% costs -15
   * Clamped to [0, 100].
   */
  async getRemediationHealth(tenantId: string): Promise<RemediationHealth> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'closed')
             AND due_date IS NOT NULL
             AND due_date < NOW()
         )::int AS overdue_tasks
       FROM "${schema}".remediation_tasks`,
    ).catch(() => ({
      rows: [{ total: 0, completed: 0, overdue_tasks: 0 }],
    }));

    const row = rows[0] ?? {};
    const total = parseInt(row.total ?? '0', 10);
    const completed = parseInt(row.completed ?? '0', 10);
    const overdueTasks = parseInt(row.overdue_tasks ?? '0', 10);
    const completionRate = total > 0 ? Math.round((completed / total) * 10000) / 100 : 100;

    // Health score algorithm
    let healthScore = 100;
    healthScore -= Math.min(overdueTasks * 10, 50);
    if (completionRate < 50) healthScore -= 30;
    else if (completionRate < 75) healthScore -= 15;
    healthScore = Math.max(0, Math.min(100, healthScore));

    // Grade mapping
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
      overdueTasks,
      completionRate,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Produce daily trend data for the specified number of days.
   * Each data point includes tasks created and tasks completed.
   */
  async getRemediationTrend(tenantId: string, days: number): Promise<RemediationTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    const { rows } = await safeQuery(
      `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".remediation_tasks rt
           WHERE rt.created_at::date = d.date::date
         ), 0) AS tasks_created,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".remediation_tasks rt
           WHERE rt.status = 'completed'
             AND rt.updated_at::date = d.date::date
         ), 0) AS tasks_completed
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       ORDER BY d.date ASC`,
      [safeDays],
    ).catch(() => ({ rows: [] }));

    return rows.map((r: Record<string, unknown>) => ({
      date: r.date,
      tasksCreated: parseInt((r as any).tasks_created ?? '0', 10),
      tasksCompleted: parseInt((r as any).tasks_completed ?? '0', 10),
    }));
  }
}
