/**
 * AuditDashboardService -- Enterprise Audit Dashboard
 * ====================================================
 * Aggregates audit health, trend data, finding severity distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped audit tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner audit
 * @module audit
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Audit status breakdown counts. */
export interface AuditStatusCounts {
  planned: number;
  in_progress: number;
  completed: number;
}

/** Finding severity breakdown counts. */
export interface FindingSeverityCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
}

/** Top-level dashboard summary. */
export interface AuditDashboardSummary {
  tenantId: string;
  totalAudits: number;
  byStatus: AuditStatusCounts;
  totalFindings: number;
  findingsBySeverity: FindingSeverityCounts;
}

/** Health score result. */
export interface AuditHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  overdueAudits: number;
  unresolvedCriticalFindings: number;
  evaluatedAt: string;
}

/** Daily trend data point. */
export interface AuditTrendDataPoint {
  date: string;
  auditsStarted: number;
  auditsCompleted: number;
  findingsRaised: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class AuditDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: total audits by status
   * (planned/in_progress/completed) and findings by severity.
   */
  async getDashboardSummary(tenantId: string): Promise<AuditDashboardSummary> {
    const schema = tenantSchema(tenantId);

    // Audit status aggregates
    const auditResult = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'planned')::int AS planned,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
       FROM "${schema}".audits`,
    ).catch(() => ({
      rows: [{ total: 0, planned: 0, in_progress: 0, completed: 0 }],
    }));

    const aRow = auditResult.rows[0] ?? {};

    // Findings severity aggregates
    const findingResult = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE severity = 'critical')::int AS critical,
         COUNT(*) FILTER (WHERE severity = 'high')::int AS high,
         COUNT(*) FILTER (WHERE severity = 'medium')::int AS medium,
         COUNT(*) FILTER (WHERE severity = 'low')::int AS low
       FROM "${schema}".findings`,
    ).catch(() => ({
      rows: [{ total: 0, critical: 0, high: 0, medium: 0, low: 0 }],
    }));

    const fRow = findingResult.rows[0] ?? {};

    return {
      tenantId,
      totalAudits: parseInt(aRow.total ?? '0', 10),
      byStatus: {
        planned: parseInt(aRow.planned ?? '0', 10),
        in_progress: parseInt(aRow.in_progress ?? '0', 10),
        completed: parseInt(aRow.completed ?? '0', 10),
      },
      totalFindings: parseInt(fRow.total ?? '0', 10),
      findingsBySeverity: {
        critical: parseInt(fRow.critical ?? '0', 10),
        high: parseInt(fRow.high ?? '0', 10),
        medium: parseInt(fRow.medium ?? '0', 10),
        low: parseInt(fRow.low ?? '0', 10),
      },
    };
  }

  /**
   * Compute a health score (0-100) based on audit programme health.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -15 per overdue audit (capped at -45)
   *   - Penalty: -20 per unresolved critical finding (capped at -60)
   * Clamped to [0, 100].
   */
  async getAuditHealth(tenantId: string): Promise<AuditHealth> {
    const schema = tenantSchema(tenantId);

    // Overdue audits: planned or in_progress past their due date
    const overdueResult = await safeQuery(
      `SELECT
         COUNT(*)::int AS overdue_audits
       FROM "${schema}".audits
       WHERE status IN ('planned', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date < NOW()`,
    ).catch(() => ({
      rows: [{ overdue_audits: 0 }],
    }));

    // Unresolved critical findings
    const criticalResult = await safeQuery(
      `SELECT
         COUNT(*)::int AS unresolved_critical
       FROM "${schema}".findings
       WHERE severity = 'critical'
         AND status NOT IN ('resolved', 'closed')`,
    ).catch(() => ({
      rows: [{ unresolved_critical: 0 }],
    }));

    const overdueAudits = parseInt(overdueResult.rows[0]?.overdue_audits ?? '0', 10);
    const unresolvedCriticalFindings = parseInt(criticalResult.rows[0]?.unresolved_critical ?? '0', 10);

    // Health score algorithm
    let healthScore = 100;
    healthScore -= Math.min(overdueAudits * 15, 45);
    healthScore -= Math.min(unresolvedCriticalFindings * 20, 60);
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
      overdueAudits,
      unresolvedCriticalFindings,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Produce daily trend data for the specified number of days.
   * Each data point includes audits started, audits completed,
   * and findings raised on that day.
   */
  async getAuditTrend(tenantId: string, days: number): Promise<AuditTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    const { rows } = await safeQuery(
      `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".audits a
           WHERE a.created_at::date = d.date::date
         ), 0) AS audits_started,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".audits a
           WHERE a.status = 'completed'
             AND a.updated_at::date = d.date::date
         ), 0) AS audits_completed,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".findings f
           WHERE f.created_at::date = d.date::date
         ), 0) AS findings_raised
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
      auditsStarted: parseInt((r as any).audits_started ?? '0', 10),
      auditsCompleted: parseInt((r as any).audits_completed ?? '0', 10),
      findingsRaised: parseInt((r as any).findings_raised ?? '0', 10),
    }));
  }
}
