/**
 * IncidentDashboardService -- Enterprise Incident Dashboard
 * ====================================================
 * Aggregates incident health, trend data, severity/status distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped incident tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner incident
 * @module incident
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Incident status breakdown counts. */
export interface IncidentStatusCounts {
  open: number;
  investigating: number;
  contained: number;
  resolved: number;
  closed: number;
}

/** Incident severity breakdown counts. */
export interface IncidentSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** Top-level dashboard summary. */
export interface IncidentDashboardSummary {
  tenantId: string;
  totalIncidents: number;
  byStatus: IncidentStatusCounts;
  bySeverity: IncidentSeverityCounts;
  slaBreaches: number;
}

/** Health score result. */
export interface IncidentHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  openIncidents: number;
  slaBreaches: number;
  evaluatedAt: string;
}

/** Daily trend data point. */
export interface IncidentTrendDataPoint {
  date: string;
  newIncidents: number;
  resolvedIncidents: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class IncidentDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: total incidents by
   * status and severity, plus SLA breach count.
   */
  async getDashboardSummary(tenantId: string): Promise<IncidentDashboardSummary> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'open')::int AS open,
         COUNT(*) FILTER (WHERE status = 'investigating')::int AS investigating,
         COUNT(*) FILTER (WHERE status = 'contained')::int AS contained,
         COUNT(*) FILTER (WHERE status = 'resolved')::int AS resolved,
         COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
         COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE severity = 'low')::int AS low,
         COUNT(*) FILTER (WHERE sla_breached = true)::int AS sla_breaches
       FROM "${schema}".incidents`,
    ).catch(() => ({
      rows: [{
        total: 0, open: 0, investigating: 0, contained: 0, resolved: 0, closed: 0,
        critical: 0, high: 0, medium: 0, low: 0, sla_breaches: 0,
      }],
    }));

    const r = rows[0] ?? {};

    return {
      tenantId,
      totalIncidents: parseInt(r.total ?? '0', 10),
      byStatus: {
        open: parseInt(r.open ?? '0', 10),
        investigating: parseInt(r.investigating ?? '0', 10),
        contained: parseInt(r.contained ?? '0', 10),
        resolved: parseInt(r.resolved ?? '0', 10),
        closed: parseInt(r.closed ?? '0', 10),
      },
      bySeverity: {
        critical: parseInt(r.critical ?? '0', 10),
        high: parseInt(r.high ?? '0', 10),
        medium: parseInt(r.medium ?? '0', 10),
        low: parseInt(r.low ?? '0', 10),
      },
      slaBreaches: parseInt(r.sla_breaches ?? '0', 10),
    };
  }

  /**
   * Compute a health score (0-100) based on incident posture.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -10 per open incident (capped at -50)
   *   - Penalty: -15 per SLA breach (capped at -45)
   * Clamped to [0, 100].
   */
  async getIncidentHealth(tenantId: string): Promise<IncidentHealth> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('open', 'investigating', 'contained'))::int AS open_incidents,
         COUNT(*) FILTER (WHERE sla_breached = true AND status NOT IN ('resolved', 'closed'))::int AS sla_breaches
       FROM "${schema}".incidents`,
    ).catch(() => ({
      rows: [{ open_incidents: 0, sla_breaches: 0 }],
    }));

    const row = rows[0] ?? {};
    const openIncidents = parseInt(row.open_incidents ?? '0', 10);
    const slaBreaches = parseInt(row.sla_breaches ?? '0', 10);

    // Health score algorithm
    let healthScore = 100;
    healthScore -= Math.min(openIncidents * 10, 50);
    healthScore -= Math.min(slaBreaches * 15, 45);
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
      openIncidents,
      slaBreaches,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Produce daily trend data for the specified number of days.
   * Each data point includes new and resolved incident counts.
   */
  async getIncidentTrend(tenantId: string, days: number): Promise<IncidentTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    const { rows } = await safeQuery(
      `SELECT
         d.date::date::text AS date,
         COUNT(i.incident_id) FILTER (WHERE i.created_at::date = d.date::date)::int AS new_incidents,
         COUNT(i.incident_id) FILTER (
           WHERE i.status IN ('resolved', 'closed')
             AND i.updated_at::date = d.date::date
         )::int AS resolved_incidents
       FROM generate_series(
         (CURRENT_DATE - ($1::int - 1) * INTERVAL '1 day')::date,
         CURRENT_DATE,
         '1 day'::interval
       ) AS d(date)
       LEFT JOIN "${schema}".incidents i
         ON (i.created_at::date = d.date::date
             OR (i.status IN ('resolved', 'closed') AND i.updated_at::date = d.date::date))
       GROUP BY d.date
       ORDER BY d.date ASC`,
      [safeDays],
    ).catch(() => ({ rows: [] }));

    return rows.map((r: Record<string, unknown>) => ({
      date: r.date,
      newIncidents: parseInt((r as any).new_incidents ?? '0', 10),
      resolvedIncidents: parseInt((r as any).resolved_incidents ?? '0', 10),
    }));
  }
}
