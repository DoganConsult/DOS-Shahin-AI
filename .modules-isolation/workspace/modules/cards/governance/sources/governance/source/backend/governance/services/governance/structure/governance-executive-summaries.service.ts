import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export async function listSummaries(tenantId: string, filters?: { status?: string; summary_type?: string }) {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_executive_summaries WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (filters?.status) { params.push(filters.status); sql += ` AND status = $${params.length}`; }
  if (filters?.summary_type) { params.push(filters.summary_type); sql += ` AND summary_type = $${params.length}`; }
  sql += ' ORDER BY period_end DESC NULLS LAST, created_at DESC';
  const result = await safeQuery(sql, params);
  return { summaries: result.rows, count: result.rows.length };
}

export async function getSummaryById(tenantId: string, summaryId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_executive_summaries WHERE summary_id=$1 AND deleted_at IS NULL`,
    [summaryId],
  );
  return result.rows[0] || null;
}

export async function createSummary(tenantId: string, data: Record<string, unknown>, userId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_executive_summaries (tenant_id, title_en, title_ar, period_start, period_end, summary_type, highlights, key_risks, key_decisions, recommendations, prepared_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [tenantId, data.title_en, data.title_ar, data.period_start, data.period_end, data.summary_type || 'monthly', data.highlights, data.key_risks, data.key_decisions, data.recommendations, userId],
  );
  return result.rows[0];
}

export async function updateSummary(tenantId: string, summaryId: string, data: Record<string, unknown>) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_executive_summaries SET title_en=COALESCE($2,title_en), title_ar=COALESCE($3,title_ar), period_start=COALESCE($4,period_start), period_end=COALESCE($5,period_end), summary_type=COALESCE($6,summary_type), highlights=COALESCE($7,highlights), key_risks=COALESCE($8,key_risks), key_decisions=COALESCE($9,key_decisions), recommendations=COALESCE($10,recommendations), updated_at=NOW() WHERE summary_id=$1 AND deleted_at IS NULL RETURNING *`,
    [summaryId, data.title_en, data.title_ar, data.period_start, data.period_end, data.summary_type, data.highlights, data.key_risks, data.key_decisions, data.recommendations],
  );
  return result.rows[0] || null;
}

export async function approveSummary(tenantId: string, summaryId: string, userId: string, userRoles: string[] = []) {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function publishSummary(tenantId: string, summaryId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_executive_summaries SET status='published', published_at=NOW(), updated_at=NOW() WHERE summary_id=$1 AND status='approved' AND deleted_at IS NULL RETURNING *`,
    [summaryId],
  );
  return result.rows[0] || null;
}

export async function generateSummary(tenantId: string, data: { period_start?: string; period_end?: string; summary_type?: string }, userId: string) {
  const schema = tenantSchema(tenantId);
  const health = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".governance_health_scores WHERE tenant_id=$1 ORDER BY computed_at DESC LIMIT 1`, [tenantId]), { tenantId: tenantId, operation: 'query governance_health_scores' });
  const overdueActions = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND due_date < NOW() AND status NOT IN ('completed','closed')`), { tenantId: tenantId, operation: 'query governance_health_scores' });
  const openExceptions = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".exceptions WHERE deleted_at IS NULL AND status IN ('open','approved') AND (severity='high' OR severity='critical')`), { tenantId: tenantId, operation: 'query governance_action_items' });
  const pendingDecisions = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_decisions WHERE deleted_at IS NULL AND status IN ('draft','pending_vote')`), { tenantId: tenantId, operation: 'query exceptions' });
  const violations = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(`SELECT COUNT(*)::int AS count FROM "${schema}".governance_enforcement_log WHERE status='open' AND tenant_id=$1`, [tenantId]), { tenantId: tenantId, operation: 'query governance_decisions' });

  const content = {
    health_score: health.rows[0] || null,
    overdue_actions: +overdueActions.rows[0].count,
    high_risk_exceptions: +openExceptions.rows[0].count,
    pending_decisions: +pendingDecisions.rows[0].count,
    open_violations: +violations.rows[0].count,
  };

  const highlights = `Governance health: ${health.rows[0]?.overall_score ?? 'N/A'} (${health.rows[0]?.overall_grade ?? 'N/A'}). ${+overdueActions.rows[0].count} overdue actions. ${+openExceptions.rows[0].count} high-risk exceptions open.`;
  const keyRisks = `${+openExceptions.rows[0].count} high/critical exceptions without resolution. ${+violations.rows[0].count} enforcement violations pending.`;
  const keyDecisions = `${+pendingDecisions.rows[0].count} governance decisions awaiting vote or implementation.`;

  const result = await safeQuery(
    `INSERT INTO "${schema}".governance_executive_summaries (tenant_id, title_en, period_start, period_end, summary_type, content, highlights, key_risks, key_decisions, prepared_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [tenantId, `Governance Executive Summary — ${data.summary_type || 'monthly'}`, data.period_start, data.period_end, data.summary_type || 'monthly', JSON.stringify(content), highlights, keyRisks, keyDecisions, userId],
  );
  return result.rows[0];
}

export async function deleteSummary(tenantId: string, summaryId: string) {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".governance_executive_summaries SET deleted_at=NOW() WHERE summary_id=$1 AND deleted_at IS NULL RETURNING summary_id`,
    [summaryId],
  );
  return result.rows[0] || null;
}
