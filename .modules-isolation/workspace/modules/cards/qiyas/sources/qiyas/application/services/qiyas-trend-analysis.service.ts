// ============================================
// Shahin-Ai — Qiyas Trend Analysis
// Historical scoring trends, period-over-period comparison,
// gap evolution, improvement velocity, forecast projections
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';

// === Types ===

export interface ScorePeriod {
  assessmentId: string;
  period: string;
  score: number;
  maturityLevel: number;
  framework: string;
  completedAt: string;
}

export interface TrendPoint {
  period: string;
  score: number;
  maturityLevel: number;
  delta: number | null;
  trend: "improving" | "declining" | "stable" | null;
}

export interface PeriodComparison {
  framework: string;
  currentPeriod: ScorePeriod;
  previousPeriod: ScorePeriod | null;
  scoreDelta: number;
  levelDelta: number;
  trend: "improving" | "declining" | "stable";
  improvementRate: number;
}

export interface ForecastProjection {
  framework: string;
  currentScore: number;
  projectedScore: number;
  projectedLevel: number;
  projectionPeriods: number;
  velocityPerPeriod: number;
  confidence: "low" | "medium" | "high";
}

export interface GapEvolution {
  domain: string;
  periods: Array<{ period: string; gap: number }>;
  trend: "closing" | "widening" | "stable";
  avgGapReductionPerPeriod: number;
}

// === Pure Functions ===

export function computeVelocity(scores: number[]): number {
  if (scores.length < 2) return 0;
  const deltas = scores.slice(1).map((s, i) => s - scores[i]);
  return Math.round((deltas.reduce((sum, d) => sum + d, 0) / deltas.length) * 100) / 100;
}

export function projectScore(currentScore: number, velocity: number, periods: number): number {
  const projected = currentScore + velocity * periods;
  return Math.min(100, Math.max(0, Math.round(projected * 10) / 10));
}

export function computeTrendPoints(periods: ScorePeriod[]): TrendPoint[] {
  return periods.map((p, i) => {
    const prev = periods[i - 1];
    const delta = prev ? Math.round((p.score - prev.score) * 10) / 10 : null;
    const trend = delta === null ? null : delta > 0.5 ? "improving" : delta < -0.5 ? "declining" : "stable";
    return { period: p.period, score: p.score, maturityLevel: p.maturityLevel, delta, trend };
  });
}

export function assessForecastConfidence(dataPointCount: number): ForecastProjection["confidence"] {
  if (dataPointCount >= 5) return "high";
  if (dataPointCount >= 3) return "medium";
  return "low";
}

export function computeImprovementRate(previousScore: number, currentScore: number): number {
  if (previousScore === 0) return 0;
  return Math.round(((currentScore - previousScore) / previousScore) * 100 * 10) / 10;
}

// === DB Functions ===

export async function getScoreHistory(
  tenantId: string,
  framework: string,
  limitPeriods = 12
): Promise<ScorePeriod[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT id, score, maturity_level, framework, updated_at,
            TO_CHAR(updated_at, 'YYYY-MM') as period
     FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND framework = $2 AND status = 'completed'
       AND deleted_at IS NULL AND score IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT $3`,
    [tenantId, framework, limitPeriods]
  );

  return result.rows.map(r => ({
    assessmentId: r.id,
    period: r.period,
    score: parseFloat(r.score),
    maturityLevel: parseInt(r.maturity_level, 10),
    framework: r.framework,
    completedAt: r.updated_at?.toISOString?.() || r.updated_at,
  }));
}

export async function getPeriodComparison(
  tenantId: string,
  framework: string
): Promise<PeriodComparison | null> {
  const history = await getScoreHistory(tenantId, framework, 2);
  if (history.length === 0) return null;

  const current = history[history.length - 1];
  const previous = history.length > 1 ? history[history.length - 2] : null;

  const scoreDelta = previous ? Math.round((current.score - previous.score) * 10) / 10 : 0;
  const levelDelta = previous ? current.maturityLevel - previous.maturityLevel : 0;
  const trend = scoreDelta > 0.5 ? "improving" : scoreDelta < -0.5 ? "declining" : "stable";
  const improvementRate = previous ? computeImprovementRate(previous.score, current.score) : 0;

  return { framework, currentPeriod: current, previousPeriod: previous, scoreDelta, levelDelta, trend, improvementRate };
}

export async function buildTrendChart(
  tenantId: string,
  framework: string,
  periods = 6
): Promise<{ framework: string; points: TrendPoint[]; velocity: number }> {
  const history = await getScoreHistory(tenantId, framework, periods);
  const points = computeTrendPoints(history);
  const velocity = computeVelocity(history.map(h => h.score));
  return { framework, points, velocity };
}

export async function getForecastProjection(
  tenantId: string,
  framework: string,
  forecastPeriods = 3
): Promise<ForecastProjection> {
  const { scoreToMaturityLevel } = await import("./qiyas-scoring.service.js");
  const history = await getScoreHistory(tenantId, framework);

  const velocity = computeVelocity(history.map(h => h.score));
  const currentScore = history.length > 0 ? history[history.length - 1].score : 0;
  const projectedScore = projectScore(currentScore, velocity, forecastPeriods);
  const projectedLevel = scoreToMaturityLevel(projectedScore);

  return {
    framework,
    currentScore,
    projectedScore,
    projectedLevel,
    projectionPeriods: forecastPeriods,
    velocityPerPeriod: velocity,
    confidence: assessForecastConfidence(history.length),
  };
}

export async function getMultiFrameworkTrends(
  tenantId: string
): Promise<Array<{ framework: string; latestScore: number | null; velocity: number; trend: "improving" | "declining" | "stable" }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT DISTINCT framework FROM "${schema}".qiyas_qiyas
     WHERE tenant_id = $1 AND deleted_at IS NULL AND assessor != 'question_bank'`,
    [tenantId]
  );

  const frameworkTrends = await Promise.all(
    result.rows.map(async r => {
      const history = await getScoreHistory(tenantId, r.framework, 6);
      const velocity = computeVelocity(history.map(h => h.score));
      const latestScore = history.length > 0 ? history[history.length - 1].score : null;
      const trend = velocity > 0.5 ? "improving" : velocity < -0.5 ? "declining" : "stable";
      return { framework: r.framework, latestScore, velocity, trend } as const;
    })
  );

  return frameworkTrends;
}

export async function getGapEvolution(
  tenantId: string,
  framework: string,
  targetScore = 70
): Promise<GapEvolution[]> {
  const history = await getScoreHistory(tenantId, framework);

  const domainGapMap: Record<string, Array<{ period: string; gap: number }>> = {};
  for (const period of history) {
    const gap = Math.max(0, targetScore - period.score);
    if (!domainGapMap["overall"]) domainGapMap["overall"] = [];
    domainGapMap["overall"].push({ period: period.period, gap });
  }

  return Object.entries(domainGapMap).map(([domain, periods]) => {
    const gaps = periods.map(p => p.gap);
    const velocity = computeVelocity(gaps);
    const trend = velocity < -0.5 ? "closing" : velocity > 0.5 ? "widening" : "stable";
    const avgReduction = gaps.length > 1 ? Math.round(((gaps[0] - gaps[gaps.length - 1]) / (gaps.length - 1)) * 100) / 100 : 0;
    return { domain, periods, trend, avgGapReductionPerPeriod: avgReduction };
  });
}
