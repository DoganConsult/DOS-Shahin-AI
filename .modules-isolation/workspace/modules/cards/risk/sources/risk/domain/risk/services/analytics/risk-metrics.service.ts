// ============================================
// Shahin — Risk Metrics Service
// KPIs: avg score, distribution, top-10, trends
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

/**
 * Derive risk level from numeric risk_score.
 * critical ≥ 20, high ≥ 12, medium ≥ 6, low < 6
 */
function riskLevel(score: number): string {
  if (score >= 20) return 'critical';
  if (score >= 12) return 'high';
  if (score >= 6) return 'medium';
  return 'low';
}

/**
 * Compute risk KPIs for a tenant.
 * Returns average score, distribution by level, top-10 risks, and total count.
 */
export async function computeRiskKPIs(tenantId: string): Promise<{
  averageScore: number;
  distribution: { critical: number; high: number; medium: number; low: number };
  topRisks: unknown[];
  totalRisks: number;
}> {
  const schema = tenantSchema(tenantId);

  // Aggregate stats in a single query
  const stats = await safeQuery(
    `SELECT
       COALESCE(AVG(risk_score), 0)::float AS avg_score,
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE risk_score >= 20)::int AS critical,
       COUNT(*) FILTER (WHERE risk_score >= 12 AND risk_score < 20)::int AS high,
       COUNT(*) FILTER (WHERE risk_score >= 6  AND risk_score < 12)::int AS medium,
       COUNT(*) FILTER (WHERE risk_score < 6)::int AS low
     FROM "${schema}".risks`
  );

  const row = getFirstRow(stats);

  // Top 10 risks by score descending
  const top = await safeQuery(
    `SELECT risk_id, title, risk_score, likelihood, impact, status, owner, created_at
     FROM "${schema}".risks
     ORDER BY risk_score DESC, created_at DESC
     LIMIT 10`
  );

  return {
    averageScore: parseFloat(Number(row.avg_score).toFixed(2)),
    distribution: {
      critical: row.critical,
      high: row.high,
      medium: row.medium,
      low: row.low,
    },
    topRisks: top.rows,
    totalRisks: row.total,
  };
}

/**
 * Get risk score trends over time for a tenant.
 * Groups risks by created_at date and returns daily average scores and counts.
 */
export async function getRiskTrends(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{ date: string; avgScore: number; count: number }[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       DATE(created_at) AS date,
       AVG(risk_score)::float AS avg_score,
       COUNT(*)::int AS count
     FROM "${schema}".risks
     WHERE created_at >= $1 AND created_at <= $2
     GROUP BY DATE(created_at)
     ORDER BY date ASC`,
    [startDate.toISOString(), endDate.toISOString()]
  );

  return result.rows.map((r: GenericRow) => ({
    date: r.date instanceof Date ? r.date.toISOString().split('T')[0] : String(r.date),
    avgScore: parseFloat(Number(r.avg_score).toFixed(2)),
    count: r.count,
  }));
}

/**
 * Pure function: compute KPI summary from a list of risk rows.
 * Used internally by computeRiskKPIs and exposed for testing.
 */
export function computeKPISummary(risks: { risk_score: number }[]): {
  averageScore: number;
  distribution: { critical: number; high: number; medium: number; low: number };
  totalRisks: number;
} {
  const total = risks.length;
  if (total === 0) {
    return {
      averageScore: 0,
      distribution: { critical: 0, high: 0, medium: 0, low: 0 },
      totalRisks: 0,
    };
  }

  let sum = 0;
  const dist = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const r of risks) {
    sum += r.risk_score;
    const level = riskLevel(r.risk_score) as keyof typeof dist;
    dist[level]++;
  }

  return {
    averageScore: parseFloat((sum / total).toFixed(2)),
    distribution: dist,
    totalRisks: total,
  };
}

export { riskLevel };
