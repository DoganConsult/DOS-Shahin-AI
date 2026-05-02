// ============================================
// AGRC-OS — Control Health Snapshot Service
// Computes and stores daily health snapshots for
// all active controls, aggregating effectiveness,
// test pass rates, and evidence freshness.
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// ── Interfaces ────────────────────────────────────────────────────────────────

export interface HealthSnapshot {
  control_id: string;
  snapshot_date: string;
  effectiveness_score: number | null;
  test_pass_rate: number | null;
  evidence_freshness_pct: number | null;
  created_at: string;
}

// ── Service ───────────────────────────────────────────────────────────────────

export class ControlHealthSnapshotService {
  /**
   * Computes and stores daily health snapshots for all active controls.
   *
   * For each active control:
   * 1. effectiveness_score — latest overall_score from control_effectiveness_scores
   * 2. test_pass_rate — passed / total tests in the last 90 days
   * 3. evidence_freshness_pct — completed evidence tasks / total evidence tasks
   *
   * Uses UPSERT (ON CONFLICT) so it can be safely re-run on the same day.
   */
  async computeAndStoreSnapshots(
    tenantId: string
  ): Promise<{ snapshotsCreated: number }> {
    const schema = tenantSchema(tenantId);

    // Single query that computes all three metrics per control and upserts
    const result = await safeQuery(
      `WITH active_controls AS (
         SELECT control_id
           FROM ${schema}.controls
          WHERE deleted_at IS NULL
       ),
       effectiveness AS (
         SELECT DISTINCT ON (es.control_id)
                es.control_id,
                es.overall_score
           FROM ${schema}.control_effectiveness_scores es
           JOIN active_controls ac ON ac.control_id = es.control_id
          ORDER BY es.control_id, es.scored_at DESC
       ),
       test_rates AS (
         SELECT ct.control_id,
                CASE WHEN COUNT(*)::int = 0 THEN NULL
                     ELSE (COUNT(*) FILTER (WHERE ct.result = 'pass')::numeric
                           / COUNT(*)::numeric * 100)
                END AS pass_rate
           FROM ${schema}.control_tests ct
           JOIN active_controls ac ON ac.control_id = ct.control_id
          WHERE ct.tested_at >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY ct.control_id
       ),
       evidence_freshness AS (
         SELECT et.control_id,
                CASE WHEN COUNT(*)::int = 0 THEN NULL
                     ELSE (COUNT(*) FILTER (WHERE et.status = 'completed')::numeric
                           / COUNT(*)::numeric * 100)
                END AS freshness_pct
           FROM ${schema}.evidence_tasks et
           JOIN active_controls ac ON ac.control_id = et.control_id
          GROUP BY et.control_id
       )
       INSERT INTO ${schema}.control_health_snapshots
         (tenant_id, control_id, snapshot_date, effectiveness_score, test_pass_rate, evidence_freshness_pct, created_at)
       SELECT
         $1,
         ac.control_id,
         CURRENT_DATE,
         ROUND(e.overall_score::numeric, 2),
         ROUND(tr.pass_rate::numeric, 2),
         ROUND(ef.freshness_pct::numeric, 2),
         NOW()
       FROM active_controls ac
       LEFT JOIN effectiveness e ON e.control_id = ac.control_id
       LEFT JOIN test_rates tr ON tr.control_id = ac.control_id
       LEFT JOIN evidence_freshness ef ON ef.control_id = ac.control_id
       ON CONFLICT (tenant_id, control_id, snapshot_date)
       DO UPDATE SET
         effectiveness_score = EXCLUDED.effectiveness_score,
         test_pass_rate = EXCLUDED.test_pass_rate,
         evidence_freshness_pct = EXCLUDED.evidence_freshness_pct,
         created_at = EXCLUDED.created_at
       RETURNING control_id`,
      [tenantId]
    );

    return { snapshotsCreated: result.rows.length };
  }

  /**
   * Returns health snapshots for a specific control over the last N days.
   */
  async getSnapshots(
    tenantId: string,
    controlId: string,
    days: number = 90
  ): Promise<HealthSnapshot[]> {
    const schema = tenantSchema(tenantId);

    const result = await safeQuery(
      `SELECT control_id, snapshot_date, effectiveness_score,
              test_pass_rate, evidence_freshness_pct, created_at
         FROM ${schema}.control_health_snapshots
        WHERE control_id = $1
          AND snapshot_date >= CURRENT_DATE - ($2 || ' days')::interval
        ORDER BY snapshot_date DESC`,
      [controlId, days.toString()]
    );

    return result.rows.map(( r: Record<string, unknown>) => ({
      control_id: r.control_id,
      snapshot_date: r.snapshot_date,
      effectiveness_score: r.effectiveness_score != null ? Number(r.effectiveness_score) : null,
      test_pass_rate: r.test_pass_rate != null ? Number(r.test_pass_rate) : null,
      evidence_freshness_pct: r.evidence_freshness_pct != null ? Number(r.evidence_freshness_pct) : null,
      created_at: r.created_at,
    }));
  }
}
