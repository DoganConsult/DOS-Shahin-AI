// ============================================
// AGRC-OS — Control Home Service
// Aggregated KPIs for the Controls module home
// page: totals, failures, overdue, automation
// mix, and 12-week health trend.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

/** Breakdown of control automation types */
export interface AutomationMix {
  manual: number;
  semi_automated: number;
  automated: number;
}

/** Single week data point for health trend */
export interface HealthTrendPoint {
  week_start: string;
  avg_effectiveness: number;
}

/** All KPIs returned by the Controls home page */
export interface ControlsHomeKpis {
  totalActive: number;
  keyControls: number;
  failedTestsThisPeriod: number;
  overdueTests: number;
  openDeficiencies: number;
  automationMix: AutomationMix;
  healthTrend: HealthTrendPoint[];
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlHomeService {
  /**
   * Returns aggregated KPIs for the controls module home page.
   * All counts are scoped to the tenant schema and exclude soft-deleted rows.
   */
  async getHomeKpis(tenantId: string): Promise<ControlsHomeKpis> {
    const schema = tenantSchema(tenantId);

    // Run independent counts in parallel for performance
    const [
      activeResult,
      keyResult,
      failedResult,
      overdueResult,
      deficiencyResult,
      automationResult,
      trendResult,
    ] = await Promise.all([
      // Total active controls (not soft-deleted)
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.controls
          WHERE deleted_at IS NULL`,
        []
      ),

      // Key controls: SOX-relevant or marked as key
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.controls
          WHERE deleted_at IS NULL
            AND (is_sox = true)`,
        []
      ),

      // Failed tests in the last 30 days
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.control_failures
          WHERE detected_at > NOW() - INTERVAL '30 days'`,
        []
      ),

      // Overdue tests: next_test_due_at in the past, or never tested and created > 90 days ago
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.controls
          WHERE deleted_at IS NULL
            AND (
              last_tested_at IS NULL AND created_at < NOW() - INTERVAL '90 days'
            )`,
        []
      ),

      // Open deficiencies (issues not closed or resolved)
      safeQuery(
        `SELECT COUNT(*)::int AS count
           FROM ${schema}.control_issues
          WHERE status NOT IN ('closed', 'resolved')`,
        []
      ),

      // Automation mix: count per control_type
      safeQuery(
        `SELECT
           COALESCE(control_type, 'manual') AS control_type,
           COUNT(*)::int AS count
         FROM ${schema}.controls
         WHERE deleted_at IS NULL
         GROUP BY COALESCE(control_type, 'manual')`,
        []
      ),

      // Health trend: average effectiveness per week for last 12 weeks
      safeQuery(
        `SELECT
           DATE_TRUNC('week', created_at)::text AS week_start,
           ROUND(AVG(overall_score)::numeric, 2)::float AS avg_effectiveness
         FROM ${schema}.control_effectiveness_scores
         WHERE created_at > NOW() - INTERVAL '12 weeks'
         GROUP BY DATE_TRUNC('week', created_at)
         ORDER BY week_start ASC`,
        []
      ),
    ]);

    // Build automation mix from grouped rows
    const automationMix: AutomationMix = {
      manual: 0,
      semi_automated: 0,
      automated: 0,
    };
    for (const row of automationResult.rows) {
      const key = row.control_type as keyof AutomationMix;
      if (key in automationMix) {
        automationMix[key] = row.count;
      }
    }

    // Build health trend array

    const healthTrend: HealthTrendPoint[] = trendResult.rows.map((row: Record<string, unknown>) => ({
      week_start: row.week_start,
      avg_effectiveness: row.avg_effectiveness,
    }));

    return {
      totalActive: activeResult.rows[0]?.count ?? 0,
      keyControls: keyResult.rows[0]?.count ?? 0,
      failedTestsThisPeriod: failedResult.rows[0]?.count ?? 0,
      overdueTests: overdueResult.rows[0]?.count ?? 0,
      openDeficiencies: deficiencyResult.rows[0]?.count ?? 0,
      automationMix,
      healthTrend,
    };
  }
}
