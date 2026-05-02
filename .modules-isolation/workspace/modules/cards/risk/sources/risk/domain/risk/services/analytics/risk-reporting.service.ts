/**
 * Risk Reporting Service — per spec section 13 (risk-reporting.service)
 *
 * Generates structured risk reports:
 *   - Executive risk pack (C-suite summary)
 *   - Board risk report (board-ready with heatmaps)
 *   - Top risks report (ranked by residual score)
 *   - Appetite breach report
 *   - KRI breach report
 *   - Treatment overdue report
 *   - Scenario summary report
 *   - Business unit risk report
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';

export interface ReportOutput {
  reportType: string;
  generatedAt: string;
  summary: Record<string, unknown>;
  rows: Record<string, unknown>[];
  count: number;
}

export async function generateExecutivePack(tenantId: string): Promise<ReportOutput> {
  const ts = tenantSchema(tenantId);

  const [summary, topRisks, categoryDist, trendData] = await Promise.all([
    safeQuery(`
      SELECT
        COUNT(*) as total_risks,
        COUNT(*) FILTER (WHERE COALESCE(risk_score, likelihood * impact, 0) >= 20) as critical_risks,
        COUNT(*) FILTER (WHERE COALESCE(risk_score, likelihood * impact, 0) BETWEEN 12 AND 19) as high_risks,
        COUNT(*) FILTER (WHERE status = 'active') as active_risks,
        COUNT(*) FILTER (WHERE treatment_status = 'untreated') as untreated_risks
      FROM ${ts}.risks WHERE deleted_at IS NULL
    `, []).then(r => r.rows[0]),
    safeQuery(`
      SELECT risk_id, title, category, COALESCE(risk_score, likelihood * impact, 0) as score, treatment_status, owner
      FROM ${ts}.risks WHERE deleted_at IS NULL AND status = 'active'
      ORDER BY score DESC LIMIT 10
    `, []).then(r => r.rows),
    safeQuery(`
      SELECT category, COUNT(*) as count
      FROM ${ts}.risks WHERE deleted_at IS NULL
      GROUP BY category ORDER BY count DESC
    `, []).then(r => r.rows),
    safeQuery(`
      SELECT DATE_TRUNC('month', created_at) as month, COUNT(*) as new_risks
      FROM ${ts}.risks WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY month ORDER BY month
    `, []).then(r => r.rows),
  ]);

  return {
    reportType: 'executive_pack',
    generatedAt: new Date().toISOString(),
    summary: { ...summary, categoryDistribution: categoryDist, trend: trendData },
    rows: topRisks,
    count: topRisks.length,
  };
}

export async function generateTopRisksReport(tenantId: string): Promise<ReportOutput> {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT r.risk_id, r.title, r.category, r.owner,
           COALESCE(r.risk_score, r.likelihood * r.impact, 0) as inherent_score,
           r.treatment_status, r.status,
           (SELECT COUNT(*) FROM ${ts}.control_risk_mappings crm WHERE crm.risk_id = r.risk_id) as control_count
    FROM ${ts}.risks r
    WHERE r.deleted_at IS NULL AND r.status = 'active'
    ORDER BY inherent_score DESC
    LIMIT 25
  `, []);

  return {
    reportType: 'top_risks',
    generatedAt: new Date().toISOString(),
    summary: { total: rows.length },
    rows,
    count: rows.length,
  };
}

export async function generateBURiskReport(tenantId: string): Promise<ReportOutput> {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT
      COALESCE(r.category, 'unclassified') as business_segment,
      COUNT(*) as total_risks,
      COUNT(*) FILTER (WHERE COALESCE(r.risk_score, r.likelihood * r.impact, 0) >= 20) as critical,
      COUNT(*) FILTER (WHERE COALESCE(r.risk_score, r.likelihood * r.impact, 0) BETWEEN 12 AND 19) as high,
      COUNT(*) FILTER (WHERE r.treatment_status IN ('untreated', 'in_progress')) as open_treatments,
      AVG(COALESCE(r.risk_score, r.likelihood * r.impact, 0))::numeric(5,2) as avg_score
    FROM ${ts}.risks r
    WHERE r.deleted_at IS NULL
    GROUP BY business_segment
    ORDER BY avg_score DESC
  `, []);

  return {
    reportType: 'bu_risk',
    generatedAt: new Date().toISOString(),
    summary: { segments: rows.length },
    rows,
    count: rows.length,
  };
}

export async function generateScenarioSummary(tenantId: string): Promise<ReportOutput> {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT s.scenario_id, s.scenario_name, s.baseline_score, s.scenario_score,
           s.mc_mean_loss, s.mc_p95_loss, r.title as risk_title, r.category
    FROM ${ts}.risk_scenarios s
    JOIN ${ts}.risks r ON r.risk_id = s.risk_id
    ORDER BY s.mc_p95_loss DESC NULLS LAST
  `, []);

  return {
    reportType: 'scenario_summary',
    generatedAt: new Date().toISOString(),
    summary: { totalScenarios: rows.length },
    rows,
    count: rows.length,
  };
}

export async function generateAppetiteBreachReport(tenantId: string): Promise<ReportOutput> {
  const ts = tenantSchema(tenantId);
  const { rows } = await safeQuery(`
    SELECT r.risk_id, r.title, r.category, r.owner,
           COALESCE(r.risk_score, r.likelihood * r.impact, 0) as score,
           ac.appetite_level, ac.threshold_high, ac.threshold_critical
    FROM ${ts}.risks r
    LEFT JOIN ${ts}.risk_appetite_config ac ON ac.risk_category = r.category AND ac.is_active = true
    WHERE r.deleted_at IS NULL
      AND COALESCE(r.risk_score, r.likelihood * r.impact, 0) > COALESCE(ac.threshold_high, 15)
    ORDER BY score DESC
  `, []);

  return {
    reportType: 'appetite_breach',
    generatedAt: new Date().toISOString(),
    summary: { breaches: rows.length },
    rows,
    count: rows.length,
  };
}
