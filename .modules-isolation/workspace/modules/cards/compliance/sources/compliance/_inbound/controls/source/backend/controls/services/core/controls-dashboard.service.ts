/**
 * ControlsDashboardService -- Enterprise Controls Dashboard
 * ====================================================
 * Aggregates control health, trend data, effectiveness distributions,
 * and summary statistics for operational dashboards and admin surfaces.
 *
 * All data is derived from tenant-scoped controls tables via
 * `tenantSchema(tenantId)` for strict tenant isolation.
 *
 * @owner controls
 * @module controls
 * @since 2026-03-31
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Types ──────────────────────────────────────────────────────────────────

/** Control status breakdown counts. */
export interface ControlStatusCounts {
  active: number;
  draft: number;
  deprecated: number;
  disabled: number;
}

/** Control effectiveness breakdown counts. */
export interface ControlEffectivenessCounts {
  effective: number;
  partially_effective: number;
  ineffective: number;
  not_tested: number;
}

/** Top-level dashboard summary. */
export interface ControlsDashboardSummary {
  tenantId: string;
  totalControls: number;
  byStatus: ControlStatusCounts;
  byEffectiveness: ControlEffectivenessCounts;
}

/** Health score result. */
export interface ControlHealth {
  tenantId: string;
  healthScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  ineffectiveControls: number;
  untestedControls: number;
  evaluatedAt: string;
}

/** Daily trend data point. */
export interface ControlTrendDataPoint {
  date: string;
  testsConducted: number;
  controlsCreated: number;
}

// ── Service ────────────────────────────────────────────────────────────────

export class ControlsDashboardService {
  /**
   * Aggregate dashboard summary for a tenant: total controls by
   * status (active/draft/deprecated/disabled) and effectiveness
   * (effective/partially_effective/ineffective/not_tested).
   */
  async getDashboardSummary(tenantId: string): Promise<ControlsDashboardSummary> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'active')::int AS active,
         COUNT(*) FILTER (WHERE status = 'draft')::int AS draft,
         COUNT(*) FILTER (WHERE status = 'deprecated')::int AS deprecated,
         COUNT(*) FILTER (WHERE status = 'disabled')::int AS disabled,
         COUNT(*) FILTER (WHERE effectiveness = 'effective')::int AS effective,
         COUNT(*) FILTER (WHERE effectiveness = 'partially_effective')::int AS partially_effective,
         COUNT(*) FILTER (WHERE effectiveness = 'ineffective')::int AS ineffective,
         COUNT(*) FILTER (WHERE effectiveness IS NULL OR effectiveness = 'not_tested')::int AS not_tested
       FROM "${schema}".controls`,
    ).catch(() => ({
      rows: [{
        total: 0, active: 0, draft: 0, deprecated: 0, disabled: 0,
        effective: 0, partially_effective: 0, ineffective: 0, not_tested: 0,
      }],
    }));

    const r = rows[0] ?? {};

    return {
      tenantId,
      totalControls: parseInt(r.total ?? '0', 10),
      byStatus: {
        active: parseInt(r.active ?? '0', 10),
        draft: parseInt(r.draft ?? '0', 10),
        deprecated: parseInt(r.deprecated ?? '0', 10),
        disabled: parseInt(r.disabled ?? '0', 10),
      },
      byEffectiveness: {
        effective: parseInt(r.effective ?? '0', 10),
        partially_effective: parseInt(r.partially_effective ?? '0', 10),
        ineffective: parseInt(r.ineffective ?? '0', 10),
        not_tested: parseInt(r.not_tested ?? '0', 10),
      },
    };
  }

  /**
   * Compute a health score (0-100) based on control posture.
   *
   * Algorithm:
   *   - Base score: 100
   *   - Penalty: -20 per ineffective control (capped at -60)
   *   - Penalty: -5 per untested control (capped at -40)
   * Clamped to [0, 100].
   */
  async getControlHealth(tenantId: string): Promise<ControlHealth> {
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE effectiveness = 'ineffective' AND status = 'active')::int AS ineffective_controls,
         COUNT(*) FILTER (
           WHERE (effectiveness IS NULL OR effectiveness = 'not_tested')
             AND status = 'active'
         )::int AS untested_controls
       FROM "${schema}".controls`,
    ).catch(() => ({
      rows: [{ ineffective_controls: 0, untested_controls: 0 }],
    }));

    const row = rows[0] ?? {};
    const ineffectiveControls = parseInt(row.ineffective_controls ?? '0', 10);
    const untestedControls = parseInt(row.untested_controls ?? '0', 10);

    // Health score algorithm
    let healthScore = 100;
    healthScore -= Math.min(ineffectiveControls * 20, 60);
    healthScore -= Math.min(untestedControls * 5, 40);
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
      ineffectiveControls,
      untestedControls,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Produce daily trend data for the specified number of days.
   * Each data point includes control tests conducted and new controls created.
   */
  async getControlTrend(tenantId: string, days: number): Promise<ControlTrendDataPoint[]> {
    const schema = tenantSchema(tenantId);
    const safeDays = Math.max(1, Math.min(365, days));

    const { rows } = await safeQuery(
      `SELECT
         d.date::date::text AS date,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".controls c
           WHERE c.last_tested_at::date = d.date::date
         ), 0) AS tests_conducted,
         COALESCE((
           SELECT COUNT(*)::int
           FROM "${schema}".controls c
           WHERE c.created_at::date = d.date::date
         ), 0) AS controls_created
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
      testsConducted: parseInt((r as any).tests_conducted ?? '0', 10),
      controlsCreated: parseInt((r as any).controls_created ?? '0', 10),
    }));
  }
}
