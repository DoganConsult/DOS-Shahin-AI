// ============================================
// Shahin -- Risk Overview Service
// Aggregated risk summary: totals, distributions,
// top risks, escalation pipeline
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

/**
 * Build the full risk-overview payload used by the workspace dashboard.
 * Includes summary KPIs, distribution breakdowns, top-10 risks, and
 * escalation pipeline counts.
 */
export async function getRiskOverview(tenantId: string, filters?: { entity?: string; category?: string }): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const catFilter = filters?.category ? ` WHERE r.category = $1` : '';
  const catParams = filters?.category ? [filters.category] : [];

  const summaryResult = await safeQuery(`
    SELECT
      COUNT(*)::int AS "totalRisks",
      COUNT(*) FILTER (WHERE r.risk_score >= 15)::int AS "highRisks",
      COUNT(*) FILTER (WHERE r.risk_score >= 20)::int AS "criticalRisks",
      COUNT(*) FILTER (WHERE COALESCE(r.owner,'') = '')::int AS "risksWithoutOwner",
      ROUND(AVG(CASE WHEN r.risk_score > 0 THEN r.risk_score ELSE NULL END),1)::float AS "residualRiskTrend"
    FROM "${schema}".risks r
    ${catFilter}
  `, catParams);

  const summary = getFirstRow(summaryResult) || {};

  try {
    const otResult = await safeQuery(`
      SELECT COUNT(*)::int AS cnt FROM "${schema}".risk_treatments
      WHERE target_date < NOW() AND status NOT IN ('done','validated','completed')
    `);
    summary.overdueTreatments = getFirstRow(otResult)?.cnt || 0;
  } catch { summary.overdueTreatments = 0; }

  try {
    const appResult = await safeQuery(`
      SELECT COUNT(*)::int AS cnt FROM "${schema}".governance_risk_appetite ga
      JOIN "${schema}".risks r ON r.category = ga.category
      WHERE r.risk_score > ga.max_residual_score
    `);
    summary.appetiteBreaches = getFirstRow(appResult)?.cnt || 0;
  } catch { summary.appetiteBreaches = 0; }

  try {
    const revResult = await safeQuery(`
      SELECT COUNT(DISTINCT risk_id)::int AS cnt FROM "${schema}".risk_review_log
      WHERE review_date > NOW() - INTERVAL '90 days'
    `);
    summary.reviewedThisCycle = getFirstRow(revResult)?.cnt || 0;
  } catch { summary.reviewedThisCycle = 0; }

  const byCat = await safeQuery(`
    SELECT category, COUNT(*)::int AS count
    FROM "${schema}".risks GROUP BY category ORDER BY count DESC
  `);

  const bySev = await safeQuery(`
    SELECT
      CASE
        WHEN risk_score >= 20 THEN 'critical'
        WHEN risk_score >= 15 THEN 'high'
        WHEN risk_score >= 8 THEN 'medium'
        ELSE 'low'
      END AS severity,
      COUNT(*)::int AS count
    FROM "${schema}".risks GROUP BY 1 ORDER BY count DESC
  `);

  const topRisks = await safeQuery(`
    SELECT risk_id AS "riskId", title, category, owner, status,
           likelihood, impact, risk_score AS "inherentScore",
           risk_score AS "residualScore", treatment_status AS "treatmentStatus"
    FROM "${schema}".risks
    ORDER BY risk_score DESC LIMIT 10
  `);

  let escalation = [
    { type: 'awaiting_review', count: 0, label: 'Awaiting Review' },
    { type: 'pending_acceptance', count: 0, label: 'Pending Acceptance' },
    { type: 'escalated', count: 0, label: 'Escalated' },
    { type: 'without_treatment', count: 0, label: 'Without Treatment' },
  ];
  try {
    const escResult = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".risk_escalation_log WHERE status = 'open'`);
    escalation[2].count = getFirstRow(escResult)?.cnt || 0;
    const accResult = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".risk_acceptance_log WHERE status = 'pending'`);
    escalation[1].count = getFirstRow(accResult)?.cnt || 0;
    const noTreatResult = await safeQuery(`
      SELECT COUNT(*)::int AS cnt FROM "${schema}".risks r
      WHERE r.risk_score >= 12 AND NOT EXISTS (
        SELECT 1 FROM "${schema}".risk_treatments rt WHERE rt.risk_id = r.risk_id
      )
    `);
    escalation[3].count = getFirstRow(noTreatResult)?.cnt || 0;
  } catch { /* tables may not exist */ }

  return {
    summary,
    distribution: {
      byCategory: byCat.rows,
      bySeverity: bySev.rows,
      byEntity: [],
    },
    topRisks: topRisks.rows,
    escalationSummary: escalation,
    trends: [],
  };
}
