/**
 * RiskDashboardService -- Enterprise Risk Dashboard
 * ====================================================
 * Aggregates risk health, trend data, severity/status distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped risk tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner risk
 * @module risk
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Severity breakdown counts. */
export interface RiskSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** Status breakdown counts. */
export interface RiskStatusCounts {
  open: number;
  mitigated: number;
  closed: number;
}

/** Top-level dashboard summary. */
export interface RiskDashboardSummary {
  tenantId: string;
  totalRisks: number;
  bySeverity: RiskSeverityCounts;
  byStatus: RiskStatusCounts;
}

/** Health score result. */
export interface RiskHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  openCritical: number;
  unmitigatedHigh: number;
  evaluatedAt: string;
}

/** Daily trend data point. */
export interface RiskTrendDataPoint {
  date: string;
  newRisks: number;
  closedRisks: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class RiskDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: total risks counted by
   * severity (critical/high/medium/low) and status (open/mitigated/closed).
   */
  async getDashboardSummary(tenantId: string): Promise<RiskDashboardSummary> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
         COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE severity = 'low')::int AS low,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'mitigated')::int AS mitigated,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed
       FROM "${schema}".risks`,
    ).catch(() => ({
      rows: [{
        total: 0, critical: 0, high: 0, medium: 0, low: 0,
        open: 0, mitigated: 0, closed: 0,
      }],
    }));

    const r = rows[0] ?? {};

    return {
      tenantId,
      totalRisks: parseInt(r.total ?? '0', 10),
      bySeverity: {
        critical: parseInt(r.critical ?? '0', 10),
        high: parseInt(r.high ?? '0', 10),
        medium: parseInt(r.medium ?? '0', 10),
        low: parseInt(r.low ?? '0', 10),
      },
      byStatus: {
        open: parseInt(r.open ?? '0', 10),
        mitigated: parseInt(r.mitigated ?? '0', 10),
        closed: parseInt(r.closed ?? '0', 10),
      },
    };
  }

  /**
   * Compute a health score (0-100) based on risk posture.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -20 per open critical risk (capped at -60)
   *   - Penalty: -10 per unmitigated high risk (capped at -40)
   * Clamped to [0, 100].
   */
  async getRiskHealth(tenantId: string): Promise<RiskHealth> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')::int AS open_critical,
         COUNT(*) FILTER (WHERE severity = 'high' AND status NOT IN ('mitigated', 'closed'))::int AS unmitigated_high
       FROM "${schema}".risks`,
    ).catch(() => ({
      rows: [{ open_critical: 0, unmitigated_high: 0 }],
    }));

    const row = rows[0] ?? {};
    const openCritical = parseInt(row.open_critical ?? '0', 10);
    const unmitigatedHigh = parseInt(row.unmitigated_high ?? '0', 10);

    // Health score algorithm
    let healthScore = 100;
    healthScore -= Math.min(openCritical * 20, 60);
    healthScore -= Math.min(unmitigatedHigh * 10, 40);
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
      openCritical,
      unmitigatedHigh,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Produce daily trend data for the specified number of days.
   * Each data point includes new risks created and risks closed on that day.
   */
  async getRiskTrend(tenantId: string, days: number): Promise<RiskTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    const { rows } = await safeQuery(
      `SELECT
         d.date::date::text AS date,
         COUNT(r.risk_id) FILTER (WHERE r.created_at::date = d.date::date)::int AS new_risks,
         COUNT(r.risk_id) FILTER (
           WHERE r.status = 'closed'
             AND r.updated_at::date = d.date::date
         )::int AS closed_risks
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       LEFT JOIN "${schema}".risks r
         ON (r.created_at::date = d.date::date
             OR (r.status = 'closed' AND r.updated_at::date = d.date::date))
       GROUP BY d.date
       ORDER BY d.date ASC`,
      [safeDays],
    ).catch((): { rows: Array<Record<string, unknown>> } => ({ rows: [] }));

    return rows.map((r: Record<string, unknown>) => ({
      date: r.date,
      newRisks: parseInt((r as any).new_risks ?? '0', 10),
      closedRisks: parseInt((r as any).closed_risks ?? '0', 10),
    }));
  }
}
