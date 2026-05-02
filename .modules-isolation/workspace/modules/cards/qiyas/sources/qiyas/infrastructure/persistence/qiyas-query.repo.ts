import { safeQuery, tenantSchema } from '../../ports/database.port';
import { QIYAS_BUSINESS_THRESHOLDS } from '../data/qiyas-constants';

export async function getDashboardStats(tenantId: string): Promise<Record<string, number>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT status, COUNT(*)::int AS count
    FROM "${schema}".qiyas_assessments
    WHERE deleted_at IS NULL
    GROUP BY status
  `);
  const stats: Record<string, number> = {};
  for (const row of result.rows) stats[row.status] = row.count;
  return stats;
}

export async function getKpiMetrics(tenantId: string): Promise<{
  totalAssessments: number;
  activeAssessments: number;
  completedAssessments: number;
  publishedAssessments: number;
  avgMaturityScore: number;
  belowThreshold: number;
  responseRate: number;
}> {
  const schema = tenantSchema(tenantId);
  const [assessResult, scoreResult, responseResult] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status IN ('draft', 'in_progress'))::int AS active,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
        COUNT(*) FILTER (WHERE status = 'published')::int AS published
      FROM "${schema}".qiyas_assessments WHERE deleted_at IS NULL
    `),
    safeQuery(`
      SELECT
        COALESCE(AVG(overall_score), 0)::numeric(5,2) AS avg_score,
        COUNT(*) FILTER (WHERE overall_score < ${QIYAS_BUSINESS_THRESHOLDS.IMPROVEMENT_THRESHOLD_SCORE})::int AS below_threshold
      FROM "${schema}".qiyas_assessments WHERE deleted_at IS NULL AND overall_score IS NOT NULL
    `),
    safeQuery(`
      SELECT
        CASE WHEN COUNT(*) > 0
          THEN ROUND(COUNT(*) FILTER (WHERE overall_score IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
          ELSE 0
        END AS response_rate
      FROM "${schema}".qiyas_assessments WHERE deleted_at IS NULL AND status IN ('in_progress', 'completed', 'reviewed', 'published')
    `),
  ]);
  const a = assessResult.rows[0] || {};
  const s = scoreResult.rows[0] || {};
  const r = responseResult.rows[0] || {};
  return {
    totalAssessments: a.total || 0,
    activeAssessments: a.active || 0,
    completedAssessments: a.completed || 0,
    publishedAssessments: a.published || 0,
    avgMaturityScore: Number(s.avg_score) || 0,
    belowThreshold: s.below_threshold || 0,
    responseRate: Number(r.response_rate) || 0,
  };
}

export async function getModelBreakdown(tenantId: string): Promise<Array<{
  modelCode: string; count: number; avgScore: number; completedCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      model_code,
      COUNT(*)::int AS count,
      COALESCE(AVG(overall_score) FILTER (WHERE overall_score IS NOT NULL), 0)::numeric(5,2) AS avg_score,
      COUNT(*) FILTER (WHERE status IN ('completed', 'published'))::int AS completed_count
    FROM "${schema}".qiyas_assessments WHERE deleted_at IS NULL
    GROUP BY model_code ORDER BY count DESC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    modelCode: r.model_code,
    count: r.count,
    avgScore: Number(r.avg_score) || 0,
    completedCount: r.completed_count,
  }));
}

export async function getScoreTrend(tenantId: string): Promise<Array<{
  month: string; avgScore: number; assessmentCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
      COALESCE(AVG(overall_score), 0)::numeric(5,2) AS avg_score,
      COUNT(*)::int AS assessment_count
    FROM "${schema}".qiyas_assessments
    WHERE deleted_at IS NULL AND overall_score IS NOT NULL
      AND created_at > NOW() - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', created_at)
    ORDER BY DATE_TRUNC('month', created_at) ASC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    month: r.month,
    avgScore: Number(r.avg_score) || 0,
    assessmentCount: r.assessment_count,
  }));
}

export async function getBelowThreshold(tenantId: string): Promise<Array<{
  id: string; modelCode: string; scope: string; overallScore: number;
  targetLevel: number; gap: number; status: string;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT id, model_code, scope, overall_score, target_level, status,
      (COALESCE(target_level, ${QIYAS_BUSINESS_THRESHOLDS.TARGET_MATURITY_DEFAULT}) - overall_score)::numeric(5,2) AS gap
    FROM "${schema}".qiyas_assessments
    WHERE deleted_at IS NULL AND overall_score IS NOT NULL
      AND overall_score < COALESCE(target_level, ${QIYAS_BUSINESS_THRESHOLDS.TARGET_MATURITY_DEFAULT})
    ORDER BY gap DESC LIMIT 100
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    id: r.id,
    modelCode: r.model_code,
    scope: r.scope,
    overallScore: Number(r.overall_score) || 0,
    targetLevel: r.target_level || QIYAS_BUSINESS_THRESHOLDS.TARGET_MATURITY_DEFAULT,
    gap: Number(r.gap) || 0,
    status: r.status,
  }));
}

export async function getResponseRates(tenantId: string): Promise<Array<{
  modelCode: string; totalSent: number; totalResponded: number; responseRate: number;
}>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      model_code,
      COUNT(*)::int AS total_sent,
      COUNT(*) FILTER (WHERE overall_score IS NOT NULL)::int AS total_responded,
      CASE WHEN COUNT(*) > 0
        THEN ROUND(COUNT(*) FILTER (WHERE overall_score IS NOT NULL)::numeric / COUNT(*)::numeric * 100, 2)
        ELSE 0
      END AS response_rate
    FROM "${schema}".qiyas_assessments
    WHERE deleted_at IS NULL AND status IN ('in_progress', 'completed', 'reviewed', 'published')
    GROUP BY model_code ORDER BY response_rate ASC
  `);

  return result.rows.map(( r: Record<string, unknown>) => ({
    modelCode: r.model_code,
    totalSent: r.total_sent,
    totalResponded: r.total_responded,
    responseRate: Number(r.response_rate) || 0,
  }));
}

export async function getAgingReport(tenantId: string): Promise<Array<{ bucket: string; count: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '7 days' THEN '0-7d'
        WHEN created_at > NOW() - INTERVAL '30 days' THEN '8-30d'
        WHEN created_at > NOW() - INTERVAL '90 days' THEN '31-90d'
        WHEN created_at > NOW() - INTERVAL '365 days' THEN '91-365d'
        ELSE '365d+'
      END AS bucket,
      COUNT(*)::int AS count
    FROM "${schema}".qiyas_assessments
    WHERE deleted_at IS NULL AND status NOT IN ('archived')
    GROUP BY bucket ORDER BY MIN(created_at) DESC
  `);
  return result.rows;
}

export async function searchEntities(tenantId: string, params: {
  query?: string;
  status?: string;
  modelCode?: string;
  scope?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}): Promise<{ rows: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const page = params.page || 1;
  const pageSize = Math.min(params.pageSize || 20, 100);
  const offset = (page - 1) * pageSize;
  const sortBy = params.sortBy || 'created_at';
  const sortDir = params.sortDir === 'ASC' ? 'ASC' : 'DESC';
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (params.query) { conditions.push(`(scope ILIKE $${idx} OR model_code ILIKE $${idx})`); values.push(`%${params.query}%`); idx++; }
  if (params.status) { conditions.push(`status = $${idx}`); values.push(params.status); idx++; }
  if (params.modelCode) { conditions.push(`model_code = $${idx}`); values.push(params.modelCode); idx++; }
  if (params.scope) { conditions.push(`scope = $${idx}`); values.push(params.scope); idx++; }
  const where = conditions.join(' AND ');
  const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${schema}".qiyas_assessments WHERE ${where}`, values);
  const dataResult = await safeQuery(`SELECT * FROM "${schema}".qiyas_assessments WHERE ${where} ORDER BY ${sortBy} ${sortDir} LIMIT $${idx} OFFSET $${idx + 1}`, [...values, pageSize, offset]);
  return { rows: dataResult.rows, total: countResult.rows[0]?.total || 0 };
}

export async function getExportData(tenantId: string, filters?: Record<string, string>): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx}`); values.push(filters.status); idx++; }
  if (filters?.modelCode) { conditions.push(`model_code = $${idx}`); values.push(filters.modelCode); idx++; }
  const result = await safeQuery(`SELECT * FROM "${schema}".qiyas_assessments WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 5000`, values);
  return result.rows;
}

export async function getCrossModuleView(tenantId: string, linkedModule: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`
    SELECT a.id, a.model_code, a.scope, a.overall_score, a.status,
      el.linked_entity_id, el.linked_module, el.link_type
    FROM "${schema}".qiyas_assessments a
    JOIN "${schema}".entity_links el ON el.source_entity_id = a.id AND el.source_module = 'qiyas'
    WHERE a.deleted_at IS NULL AND el.linked_module = $1
    ORDER BY a.created_at DESC
  `, [linkedModule]);
  return result.rows;
}
