/**
 * ActionDashboardService -- Enterprise Action Item Dashboard
 * ====================================================
 * Aggregates action item health, trend data, status/priority distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped action tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner action
 * @module action
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Action item status breakdown counts. */
export interface ActionStatusCounts {
  open: number;
  in_progress: number;
  completed: number;
  overdue: number;
}

/** Action item priority breakdown counts. */
export interface ActionPriorityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** Top-level dashboard summary. */
export interface ActionDashboardSummary {
  tenantId: string;
  totalActions: number;
  byStatus: ActionStatusCounts;
  byPriority: ActionPriorityCounts;
  unassigned: number;
}

/** Health score result. */
export interface ActionHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  overdueActions: number;
  unassignedItems: number;
  evaluatedAt: string;
}

/** Daily trend data point. */
export interface ActionTrendDataPoint {
  date: string;
  actionsCreated: number;
  actionsCompleted: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class ActionDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: total action items by
   * status and priority, plus count of unassigned items.
   */
  async getDashboardSummary(tenantId: string): Promise<ActionDashboardSummary> {
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
         )::int AS overdue,
         COUNT(*) FILTER (WHERE priority = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE priority = 'high')::int AS high,
         COUNT(*) FILTER (WHERE priority = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE priority = 'low')::int AS low,
         COUNT(*) FILTER (WHERE assigned_to IS NULL AND status NOT IN ('completed', 'closed'))::int AS unassigned
       FROM "${schema}".action_items`,
    ).catch(() => ({
      rows: [{
        total: 0, open: 0, in_progress: 0, completed: 0, overdue: 0,
        critical: 0, high: 0, medium: 0, low: 0, unassigned: 0,
      }],
    }));

    const r = rows[0] ?? {};

    return {
      tenantId,
      totalActions: parseInt(r.total ?? '0', 10),
      byStatus: {
        open: parseInt(r.open ?? '0', 10),
        in_progress: parseInt(r.in_progress ?? '0', 10),
        completed: parseInt(r.completed ?? '0', 10),
        overdue: parseInt(r.overdue ?? '0', 10),
      },
      byPriority: {
        critical: parseInt(r.critical ?? '0', 10),
        high: parseInt(r.high ?? '0', 10),
        medium: parseInt(r.medium ?? '0', 10),
        low: parseInt(r.low ?? '0', 10),
      },
      unassigned: parseInt(r.unassigned ?? '0', 10),
    };
  }

  /**
   * Compute a health score (0-100) based on action item posture.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -10 per overdue action (capped at -50)
   *   - Penalty: -5 per unassigned item (capped at -30)
   * Clamped to [0, 100].
   */
  async getActionHealth(tenantId: string): Promise<ActionHealth> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (
           WHERE status NOT IN ('completed', 'closed')
             AND due_date IS NOT NULL
             AND due_date < NOW()
         )::int AS overdue_actions,
         COUNT(*) FILTER (
           WHERE assigned_to IS NULL
             AND status NOT IN ('completed', 'closed')
         )::int AS unassigned_items
       FROM "${schema}".action_items`,
    ).catch(() => ({
      rows: [{ overdue_actions: 0, unassigned_items: 0 }],
    }));

    const row = rows[0] ?? {};
    const overdueActions = parseInt(row.overdue_actions ?? '0', 10);
    const unassignedItems = parseInt(row.unassigned_items ?? '0', 10);

    // Health score algorithm
    let healthScore = 100;
    healthScore -= Math.min(overdueActions * 10, 50);
    healthScore -= Math.min(unassignedItems * 5, 30);
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
      overdueActions,
      unassignedItems,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Produce daily trend data for the specified number of days.
   * Each data point includes actions created and actions completed.
   */
  async getActionTrend(tenantId: string, days: number): Promise<ActionTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    const { rows } = await safeQuery(
      `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".action_items ai
           WHERE ai.created_at::date = d.date::date
         ), 0) AS actions_created,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".action_items ai
           WHERE ai.status = 'completed'
             AND ai.updated_at::date = d.date::date
         ), 0) AS actions_completed
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
      actionsCreated: parseInt((r as any).actions_created ?? '0', 10),
      actionsCompleted: parseInt((r as any).actions_completed ?? '0', 10),
    }));
  }
}
