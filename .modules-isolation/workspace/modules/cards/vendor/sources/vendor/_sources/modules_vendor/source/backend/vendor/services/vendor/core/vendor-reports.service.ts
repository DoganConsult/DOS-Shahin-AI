// ============================================
// Shahin — Vendor Reports Service
// Scorecard, concentration, risk distribution,
// DD completion, SLA performance, fourth-party
// exposure, and trend analysis reports
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// ============================================================
// Scorecard Report
// ============================================================

/**
 * Aggregate vendor scorecard report: total vendors, average score,
 * grade distribution (A-F), risk tier distribution, and top 5 highest risk.
 */
export async function getScorecardReport(tenantId: string): Promise<{
  totalVendors: number;
  avgScore: number;
  gradeDistribution: Record<string, number>;
  riskTierDistribution: GenericRow[];
  topHighestRisk: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);

  const [summaryRes, gradeRes, tierRes, topRiskRes] = await Promise.all([
    // Overall summary
    safeQuery(
      `SELECT COUNT(*)::int AS total, COALESCE(AVG(assessment_score), 0)::numeric(5,2) AS avg_score
       FROM "${schema}".vendors WHERE deleted_at IS NULL`
    ),
    // Grade distribution: A(90-100), B(80-89), C(70-79), D(60-69), F(<60)
    safeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE assessment_score >= 90)::int AS "A",
         COUNT(*) FILTER (WHERE assessment_score >= 80 AND assessment_score < 90)::int AS "B",
         COUNT(*) FILTER (WHERE assessment_score >= 70 AND assessment_score < 80)::int AS "C",
         COUNT(*) FILTER (WHERE assessment_score >= 60 AND assessment_score < 70)::int AS "D",
         COUNT(*) FILTER (WHERE assessment_score < 60 OR assessment_score IS NULL)::int AS "F"
       FROM "${schema}".vendors WHERE deleted_at IS NULL`
    ),
    // Risk tier distribution
    safeQuery(
      `SELECT COALESCE(risk_tier, 'unclassified') AS risk_tier, COUNT(*)::int AS vendor_count
       FROM "${schema}".vendors WHERE deleted_at IS NULL
       GROUP BY risk_tier ORDER BY
         CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`
    ),
    // Top 5 highest risk vendors (lowest scores or highest risk tier)
    safeQuery(
      `SELECT vendor_id, name, risk_tier, assessment_score, status
       FROM "${schema}".vendors WHERE deleted_at IS NULL
       ORDER BY
         CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
         assessment_score ASC NULLS FIRST
       LIMIT 5`
    ),
  ]);

  const summary = getFirstRow(summaryRes)!;
  const grades = getFirstRow(gradeRes)!;

  return {
    totalVendors: summary?.total ?? 0,
    avgScore: parseFloat(summary?.avg_score ?? '0'),
    gradeDistribution: {
      A: grades?.A ?? 0,
      B: grades?.B ?? 0,
      C: grades?.C ?? 0,
      D: grades?.D ?? 0,
      F: grades?.F ?? 0,
    },
    riskTierDistribution: tierRes.rows,
    topHighestRisk: topRiskRes.rows,
  };
}

// ============================================================
// Concentration Report
// ============================================================

/**
 * Get concentration report from vendor_concentration_analysis,
 * broken down by dimension.
 */
export async function getConcentrationReport(tenantId: string): Promise<{
  dimensions: GenericRow[];
  totalAnalyzed: number;
  highRiskDimensions: number;
}> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT dimension, dimension_value, vendor_count, total_spend, spend_pct,
            risk_level, concentration_score, analysis_date
     FROM "${schema}".vendor_concentration_analysis
     ORDER BY analysis_date DESC, concentration_score DESC`
  );

  const highRiskDimensions = res.rows.filter(
    (r: GenericRow) => r.risk_level === 'high' || r.risk_level === 'critical'
  ).length;

  return {
    dimensions: res.rows,
    totalAnalyzed: res.rows.length,
    highRiskDimensions,
  };
}

// ============================================================
// Risk Tier Distribution
// ============================================================

/**
 * Get vendor count grouped by risk_tier.
 */
export async function getRiskTierDistribution(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT COALESCE(risk_tier, 'unclassified') AS risk_tier, COUNT(*)::int AS vendor_count
     FROM "${schema}".vendors WHERE deleted_at IS NULL
     GROUP BY risk_tier
     ORDER BY CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`
  )).rows;
}

// ============================================================
// DD Completion Rates
// ============================================================

/**
 * Get due diligence status breakdown with counts and percentages.
 */
export async function getDDCompletionRates(tenantId: string): Promise<{
  total: number;
  breakdown: Array<{ status: string; count: number; pct: number }>;
}> {
  const schema = tenantSchema(tenantId);

  const res = await safeQuery(
    `SELECT status, COUNT(*)::int AS cnt
     FROM "${schema}".vendor_due_diligence WHERE deleted_at IS NULL
     GROUP BY status ORDER BY status`
  );

  const total = res.rows.reduce((sum: number, r: GenericRow) => sum + (r.cnt as number), 0);
  const breakdown = res.rows.map((r: GenericRow) => ({
    status: r.status as string,
    count: r.cnt as number,
    pct: total > 0 ? Math.round(((r.cnt as number) / total) * 100) : 0,
  }));

  return { total, breakdown };
}

// ============================================================
// SLA Performance
// ============================================================

/**
 * Aggregate SLA measurement performance over a given number of months (default 6).
 * Returns counts of met, warning, and breached measurements.
 */
export async function getSLAPerformance(
  tenantId: string,
  months: number = 6
): Promise<{
  totalMeasurements: number;
  met: number;
  warning: number;
  breached: number;
  metPct: number;
}> {
  const schema = tenantSchema(tenantId);

  const res = getFirstRow(await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE is_met = TRUE)::int AS met,
       COUNT(*) FILTER (WHERE is_warning = TRUE)::int AS warning,
       COUNT(*) FILTER (WHERE is_breached = TRUE)::int AS breached
     FROM "${schema}".vendor_sla_measurements
     WHERE period_start >= NOW() - ($1 || ' months')::INTERVAL`,
    [months]
  ));

  const total = res?.total ?? 0;
  return {
    totalMeasurements: total,
    met: res?.met ?? 0,
    warning: res?.warning ?? 0,
    breached: res?.breached ?? 0,
    metPct: total > 0 ? Math.round((res.met / total) * 100) : 0,
  };
}

// ============================================================
// Fourth-Party Exposure
// ============================================================

/**
 * Aggregate fourth-party (sub-vendor) risk exposure
 * grouped by risk_tier and data_access_level.
 */
export async function getFourthPartyExposure(tenantId: string): Promise<{
  totalSubVendors: number;
  byRiskTier: GenericRow[];
  byDataAccess: GenericRow[];
}> {
  const schema = tenantSchema(tenantId);

  const [totalRes, tierRes, accessRes] = await Promise.all([
    safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".vendor_fourth_party_risk
       WHERE is_active = TRUE AND deleted_at IS NULL`
    ),
    safeQuery(
      `SELECT COALESCE(risk_tier, 'unclassified') AS risk_tier, COUNT(*)::int AS cnt
       FROM "${schema}".vendor_fourth_party_risk
       WHERE is_active = TRUE AND deleted_at IS NULL
       GROUP BY risk_tier
       ORDER BY CASE risk_tier WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END`
    ),
    safeQuery(
      `SELECT COALESCE(data_access_level, 'none') AS data_access_level, COUNT(*)::int AS cnt
       FROM "${schema}".vendor_fourth_party_risk
       WHERE is_active = TRUE AND deleted_at IS NULL
       GROUP BY data_access_level ORDER BY data_access_level`
    ),
  ]);

  return {
    totalSubVendors: getFirstRow(totalRes)?.cnt ?? 0,
    byRiskTier: tierRes.rows,
    byDataAccess: accessRes.rows,
  };
}

// ============================================================
// Trend Analysis
// ============================================================

/**
 * Monthly average risk scores from vendor_risk_assessments,
 * grouped by month over a given period (default 12 months).
 */
export async function getTrendAnalysis(
  tenantId: string,
  months: number = 12
): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT
       TO_CHAR(DATE_TRUNC('month', completed_at), 'YYYY-MM') AS month,
       COUNT(*)::int AS assessment_count,
       AVG(overall_score)::numeric(5,2) AS avg_score,
       MIN(overall_score)::numeric(5,2) AS min_score,
       MAX(overall_score)::numeric(5,2) AS max_score
     FROM "${schema}".vendor_risk_assessments
     WHERE completed_at IS NOT NULL
       AND completed_at >= NOW() - ($1 || ' months')::INTERVAL
       AND deleted_at IS NULL
     GROUP BY DATE_TRUNC('month', completed_at)
     ORDER BY DATE_TRUNC('month', completed_at) ASC`,
    [months]
  )).rows;
}
