import { emptyResult, query } from './ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { safeQuery } from '@dos/db';

export class ExecutiveWidgetsRepo {
  async resolveTenantSchema(tenantId: string): Promise<string> {
    const result = await safeQuery(
      `SELECT schema_name FROM public.tenants WHERE tenant_id = $1::text LIMIT 1`,
      [tenantId]
    );
    const schema = result.rows[0]?.schema_name;
    if (!schema) throw new Error('Tenant schema not found');
    return schema;
  }

  async getStaleControlsCount(schema: string): Promise<number> {
    const result = await safeQuery(
      `
      SELECT COUNT(*)::int AS cnt
      FROM (
        SELECT c.control_id
        FROM "${schema}".controls c
        LEFT JOIN "${schema}".evidence e
          ON e.control_id = c.control_id
        WHERE c.status = 'active'
        GROUP BY c.control_id
        HAVING MAX(e.expiry_date) IS NULL OR MAX(e.expiry_date) < CURRENT_DATE
      ) x
      `
    );
    return result.rows[0]?.cnt ?? 0;
  }

  async getOverdueRemediationCount(schema: string): Promise<number> {
    const result = await safeQuery(
      `
      SELECT COUNT(*)::int AS cnt
      FROM "${schema}".remediation_tasks
      WHERE status IN ('open', 'in_progress')
        AND due_date IS NOT NULL
        AND due_date < CURRENT_DATE
      `
    );
    return result.rows[0]?.cnt ?? 0;
  }

  async getPolicyReviewDebtCount(schema: string): Promise<number> {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ cnt: 0 }]), query(
      `
      SELECT COUNT(*)::int AS cnt
      FROM "${schema}".policies
      WHERE status IN ('active', 'approved', 'published')
        AND next_review_date IS NOT NULL
        AND next_review_date < CURRENT_DATE
      `
    ), {  operation: 'query policies' });
    return result.rows[0]?.cnt ?? 0;
  }

  async getLatestEngineRun(schema: string) {
    const result = await safeQuery(
      `
      SELECT
        run_id, status, started_at, completed_at,
        stale_controls, overdue_remediations, kri_breaches,
        policy_reviews_started, tasks_created, notifications_created, escalations_triggered
      FROM "${schema}".agrc_engine_runs
      ORDER BY started_at DESC
      LIMIT 1
      `
    );
    return result.rows[0] ?? null;
  }

  async getTopBreachedKris(schema: string, limit = 10) {
    const result = await safeQuery(
      `
      SELECT
        k.kri_id, k.name, k.linked_risk_id, k.owner,
        k.current_value, k.threshold_amber, k.threshold_red,
        k.status, k.trend
      FROM "${schema}".risk_kris k
      WHERE k.status IN ('amber', 'red')
      ORDER BY
        CASE WHEN k.status = 'red' THEN 1 ELSE 2 END,
        k.current_value DESC NULLS LAST
      LIMIT $1::int
      `,
      [limit]
    );
    return result.rows;
  }

  async getPolicyReviewDebt(schema: string, limit = 10) {
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), query(
      `
      SELECT
        policy_id, title, owner, next_review_date,
        GREATEST(0, CURRENT_DATE - next_review_date)::int AS days_overdue
      FROM "${schema}".policies
      WHERE status IN ('active', 'approved', 'published')
        AND next_review_date IS NOT NULL
        AND next_review_date < CURRENT_DATE
      ORDER BY next_review_date ASC
      LIMIT $1::int
      `,
      [limit]
    ), {  operation: 'query policies' });
    return result.rows;
  }

  async getEngineTrend(schema: string, limit = 12) {
    const result = await safeQuery(
      `
      SELECT
        started_at, stale_controls, overdue_remediations,
        kri_breaches, policy_reviews_started,
        tasks_created, notifications_created, escalations_triggered
      FROM "${schema}".agrc_engine_runs
      WHERE status = 'completed'
      ORDER BY started_at DESC
      LIMIT $1::int
      `,
      [limit]
    );
    return result.rows.reverse();
  }
}
