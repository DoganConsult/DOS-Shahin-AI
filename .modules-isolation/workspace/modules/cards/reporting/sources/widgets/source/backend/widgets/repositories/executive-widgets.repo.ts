import { emptyResult, query, safeQuery, tenantSchema } from '../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { getFirstRow as _getFirstRow } from '@dos/db';

export class ExecutiveWidgetsRepository {
  private schema: string;

  constructor(tenantId: string) {
    this.schema = tenantSchema(tenantId);
  }

  async getStaleControlsCount(): Promise<number> {
    const result = await safeQuery(`
      SELECT COUNT(*)::int AS cnt
      FROM (
        SELECT c.control_id
        FROM "${this.schema}".controls c
        LEFT JOIN "${this.schema}".evidence e ON e.control_id = c.control_id
        WHERE c.status = 'active'
        GROUP BY c.control_id
        HAVING MAX(e.expiry_date) IS NULL OR MAX(e.expiry_date) < CURRENT_DATE
      ) x
    `);
    return result.rows[0]?.cnt ?? 0;
  }

  async getOverdueRemediationCount(): Promise<number> {
    const result = await safeQuery(`
      SELECT COUNT(*)::int AS cnt
      FROM "${this.schema}".remediation_tasks
      WHERE status IN ('open', 'in_progress')
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
    `);
    return result.rows[0]?.cnt ?? 0;
  }

  async getPolicyReviewDebtCount(): Promise<number> {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(`
      SELECT COUNT(*)::int AS cnt
      FROM "${this.schema}".policies
      WHERE status IN ('active', 'approved', 'published')
        AND next_review_date IS NOT NULL
        AND next_review_date < CURRENT_DATE
    `), { operation: 'query policies' });
    return result.rows[0]?.cnt ?? 0;
  }

  async getLatestEngineRun() {
    const result = await safeQuery(`
      SELECT run_id, status, started_at, completed_at,
             stale_controls, overdue_remediations, kri_breaches,
             policy_reviews_started, tasks_created, notifications_created, escalations_triggered
      FROM "${this.schema}".agrc_engine_runs
      ORDER BY started_at DESC
      LIMIT 1
    `);
    return result.rows[0] ?? null;
  }

  async getTopBreachedKris(limit = 10) {
    const result = await safeQuery(`
      SELECT k.kri_id, k.name, k.linked_risk_id, k.owner,
             k.current_value, k.threshold_amber, k.threshold_red,
             k.status, k.trend
      FROM "${this.schema}".risk_kris k
      WHERE k.status IN ('amber', 'red')
      ORDER BY CASE WHEN k.status = 'red' THEN 1 ELSE 2 END,
               k.current_value DESC NULLS LAST
      LIMIT $1::int
    `, [limit]);
    return result.rows;
  }

  async getPolicyReviewDebt(limit = 10) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(`
      SELECT policy_id, title, owner, next_review_date,
             GREATEST(0, CURRENT_DATE - next_review_date)::int AS days_overdue
      FROM "${this.schema}".policies
      WHERE status IN ('active', 'approved', 'published')
        AND next_review_date IS NOT NULL
        AND next_review_date < CURRENT_DATE
      ORDER BY next_review_date ASC
      LIMIT $1::int
    `, [limit]), { operation: 'query policies' });
    return result.rows;
  }

  async getEngineTrend(limit = 12) {
    const result = await safeQuery(`
      SELECT started_at, stale_controls, overdue_remediations,
             kri_breaches, policy_reviews_started,
             tasks_created, notifications_created, escalations_triggered
      FROM "${this.schema}".agrc_engine_runs
      WHERE status = 'completed'
      ORDER BY started_at DESC
      LIMIT $1::int
    `, [limit]);
    return result.rows.reverse();
  }
}
