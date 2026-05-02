// ============================================
// Shahin-Ai — Risk Prediction Service
// KRI trend analysis, risk forecasting, anomaly
// detection, Monte Carlo simulation, and breach
// probability using pure TypeScript math (no
// external ML libraries)
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { RiskZone as _RiskZone, KRIDataPoint as _KRIDataPoint } from "../scoring/risk-scoring.service";
import type { GenericRow } from '@dos/types';

// ============================================================
// Types
// ============================================================

export interface TrendForecast {
  slope: number;
  intercept: number;
  rSquared: number;
  predictions: Array<{ date: string; predictedScore: number }>;
  direction: "improving" | "stable" | "worsening";
}

export interface MovingAverageResult {
  kriId: string;
  window7: number | null;
  window30: number | null;
  window90: number | null;
  currentScore: number;
  trend: "up" | "down" | "flat";
}

export interface AnomalyAlert {
  kriId: string;
  currentScore: number;
  mean: number;
  stdDev: number;
  zScore: number;
  severity: "warning" | "critical";
  detectedAt: string;
}

export interface RiskVelocity {
  riskId: string;
  title: string;
  currentScore: number;
  rateOfChange: number;
  acceleration: number;
  isAccelerating: boolean;
  projectedScore7d: number;
}

export interface TreatmentEffectiveness {
  riskId: string;
  treatmentId: string;
  status: string;
  effectivenessScore: number | null;
  scoreBefore: number | null;
  scoreAfter: number | null;
  scoreDelta: number | null;
  correlation: number;
}

export interface MonteCarloResult {
  riskId: string;
  simulations: number;
  meanScore: number;
  medianScore: number;
  p5: number;
  p25: number;
  p75: number;
  p95: number;
  stdDev: number;
  distribution: Array<{ bucket: number; count: number }>;
}

export interface BreachProbability {
  kriId: string;
  currentScore: number;
  highThreshold: number;
  criticalThreshold: number;
  probabilityHigh: number;
  probabilityCritical: number;
  estimatedDaysToHigh: number | null;
  estimatedDaysToCritical: number | null;
}

export interface ExecutiveSummary {
  overallDirection: "improving" | "stable" | "worsening";
  anomalyCount: number;
  acceleratingRisks: number;
  topConcerns: string[];
  forecast: string;
  generatedAt: string;
}

// ============================================================
// Pure Math Utilities
// ============================================================

/** Compute arithmetic mean of an array of numbers. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Compute population standard deviation. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const squaredDiffs = values.map((v) => (v - avg) ** 2);
  return Math.sqrt(squaredDiffs.reduce((s, d) => s + d, 0) / values.length);
}

/** Simple linear regression: returns slope, intercept, and R-squared. */
function linearRegression(xs: number[], ys: number[]): { slope: number; intercept: number; rSquared: number } {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] || 0, rSquared: 0 };

  const meanX = mean(xs);
  const meanY = mean(ys);

  let ssXY = 0;
  let ssXX = 0;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    ssXY += (xs[i] - meanX) * (ys[i] - meanY);
    ssXX += (xs[i] - meanX) ** 2;
    ssTot += (ys[i] - meanY) ** 2;
  }

  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = meanY - slope * meanX;

  let ssRes = 0;
  for (let i = 0; i < n; i++) {
    const predicted = slope * xs[i] + intercept;
    ssRes += (ys[i] - predicted) ** 2;
  }
  const rSquared = ssTot !== 0 ? 1 - ssRes / ssTot : 0;

  return { slope, intercept, rSquared };
}

/** Pearson correlation coefficient between two arrays. */
function _pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = Math.min(xs.length, ys.length);
  if (n < 2) return 0;

  const meanX = mean(xs.slice(0, n));
  const meanY = mean(ys.slice(0, n));

  let numerator = 0;
  let denomX = 0;
  let denomY = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }

  const denom = Math.sqrt(denomX * denomY);
  return denom !== 0 ? numerator / denom : 0;
}

/** Compute percentile from a sorted array using linear interpolation. */
function _percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

/** Seeded pseudo-random number generator (xorshift32) for reproducible simulations. */
function createRng(seed: number): () => number {
  let state = seed | 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >> 17;
    state ^= state << 5;
    return (state >>> 0) / 0xffffffff;
  };
}

/** Generate a normally distributed random value using Box-Muller transform. */
function normalRandom(rng: () => number, mu: number, sigma: number): number {
  const u1 = rng() || 1e-10;
  const u2 = rng();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + z * sigma;
}

/** Format a date N days from now as YYYY-MM-DD. */
function futureDateStr(daysFromNow: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  return d.toISOString().split("T")[0];
}

// ============================================================
// 1. Linear Regression Trend Forecasting
// ============================================================

/**
 * Forecast KRI scores for the next N days using ordinary least-squares
 * linear regression over historical data points.
 */
export async function forecastKRITrend(
  tenantId: string,
  kriId: string,
  forecastDays: number = 30
): Promise<TrendForecast> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT score, recorded_at FROM "${schema}".kri_history
     WHERE kri_id = $1 AND tenant_id = $2
     ORDER BY recorded_at ASC`,
    [kriId, tenantId]
  );

  const scores: number[] = result.rows.map((r: GenericRow) => parseFloat(r.score));
  const xs = scores.map((_, i) => i);
  const { slope, intercept, rSquared } = linearRegression(xs, scores);

  const n = scores.length;
  const predictions: TrendForecast["predictions"] = [];
  for (let d = 1; d <= forecastDays; d++) {
    const predictedScore = Math.max(0, Math.min(100, slope * (n - 1 + d) + intercept));
    predictions.push({ date: futureDateStr(d), predictedScore: Math.round(predictedScore * 100) / 100 });
  }

  const direction: TrendForecast["direction"] =
    slope > 0.5 ? "worsening" : slope < -0.5 ? "improving" : "stable";

  return { slope: Math.round(slope * 1000) / 1000, intercept: Math.round(intercept * 100) / 100, rSquared: Math.round(rSquared * 1000) / 1000, predictions, direction };
}

// ============================================================
// 2. Moving Average Analysis
// ============================================================

/**
 * Compute 7-day, 30-day, and 90-day moving averages for a KRI.
 * Compares current score to the 7-day average to determine trend direction.
 */
export async function getMovingAverages(
  tenantId: string,
  kriId: string
): Promise<MovingAverageResult> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT score, recorded_at FROM "${schema}".kri_history
     WHERE kri_id = $1 AND tenant_id = $2
     ORDER BY recorded_at DESC
     LIMIT 90`,
    [kriId, tenantId]
  );

  const rows = result.rows.map((r: GenericRow) => parseFloat(r.score));
  const currentScore = rows.length > 0 ? rows[0] : 0;

  const window7 = rows.length >= 7 ? mean(rows.slice(0, 7)) : rows.length > 0 ? mean(rows) : null;
  const window30 = rows.length >= 30 ? mean(rows.slice(0, 30)) : null;
  const window90 = rows.length >= 90 ? mean(rows.slice(0, 90)) : null;

  let trend: MovingAverageResult["trend"] = "flat";
  if (window7 !== null) {
    const diff = currentScore - window7;
    if (diff > 2) trend = "up";
    else if (diff < -2) trend = "down";
  }

  return {
    kriId,
    window7: window7 !== null ? Math.round(window7 * 100) / 100 : null,
    window30: window30 !== null ? Math.round(window30 * 100) / 100 : null,
    window90: window90 !== null ? Math.round(window90 * 100) / 100 : null,
    currentScore,
    trend,
  };
}

// ============================================================
// 3. Anomaly Detection (Z-Score)
// ============================================================

/**
 * Detect anomalous KRI values by computing z-scores against historical data.
 * Flags entries that deviate more than 2 standard deviations from the mean.
 */
export async function detectAnomalies(
  tenantId: string,
  threshold: number = 2
): Promise<AnomalyAlert[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT kri_id, score, recorded_at FROM "${schema}".kri_history
     WHERE tenant_id = $1
     ORDER BY recorded_at DESC`,
    [tenantId]
  );

  // Group scores by KRI
  const byKri = new Map<string, number[]>();
  const latestByKri = new Map<string, { score: number; recordedAt: string }>();

  for (const row of result.rows) {
    const kriId: string = row.kri_id;
    const score = parseFloat(row.score);
    if (!byKri.has(kriId)) {
      byKri.set(kriId, []);
      latestByKri.set(kriId, { score, recordedAt: String(row.recorded_at) });
    }
    byKri.get(kriId)!.push(score);
  }

  const alerts: AnomalyAlert[] = [];

  for (const [kriId, scores] of byKri) {
    if (scores.length < 5) continue; // Need sufficient data for meaningful stats

    const avg = mean(scores);
    const sd = stdDev(scores);
    if (sd === 0) continue;

    const latest = latestByKri.get(kriId)!;
    const zScore = (latest.score - avg) / sd;

    if (Math.abs(zScore) > threshold) {
      alerts.push({
        kriId,
        currentScore: latest.score,
        mean: Math.round(avg * 100) / 100,
        stdDev: Math.round(sd * 100) / 100,
        zScore: Math.round(zScore * 100) / 100,
        severity: Math.abs(zScore) > 3 ? "critical" : "warning",
        detectedAt: new Date().toISOString(),
      });
    }
  }

  return alerts.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}

// ============================================================
// 4. Risk Velocity
// ============================================================

/**
 * Calculate the rate of change and acceleration for each risk in the register.
 * Identifies risks whose scores are accelerating (getting worse faster).
 */
export async function getRiskVelocity(tenantId: string): Promise<RiskVelocity[]> {
  const schema = tenantSchema(tenantId);

  const risks = await safeQuery(
    `SELECT risk_id, title, score FROM "${schema}".risk_register ORDER BY score DESC`
  );

  const velocities: RiskVelocity[] = [];

  for (const risk of risks.rows) {
    const history = await safeQuery(
      `SELECT score, recorded_at FROM "${schema}".kri_history
       WHERE kri_id = $1 AND tenant_id = $2
       ORDER BY recorded_at DESC LIMIT 30`,
      [risk.risk_id, tenantId]
    );

    const scores = history.rows.map((r: GenericRow) => parseFloat(r.score)).reverse();
    if (scores.length < 3) {
      velocities.push({
        riskId: risk.risk_id,
        title: risk.title,
        currentScore: parseFloat(risk.score) || 0,
        rateOfChange: 0,
        acceleration: 0,
        isAccelerating: false,
        projectedScore7d: parseFloat(risk.score) || 0,
      });
      continue;
    }

    // Rate of change: average daily delta over the recent window
    const deltas: number[] = [];
    for (let i = 1; i < scores.length; i++) {
      deltas.push(scores[i] - scores[i - 1]);
    }
    const rateOfChange = mean(deltas);

    // Acceleration: change in rate of change (second derivative)
    const secondDeltas: number[] = [];
    for (let i = 1; i < deltas.length; i++) {
      secondDeltas.push(deltas[i] - deltas[i - 1]);
    }
    const acceleration = secondDeltas.length > 0 ? mean(secondDeltas) : 0;

    const currentScore = scores[scores.length - 1];
    const projectedScore7d = Math.max(0, Math.min(100, currentScore + rateOfChange * 7));

    velocities.push({
      riskId: risk.risk_id,
      title: risk.title,
      currentScore,
      rateOfChange: Math.round(rateOfChange * 1000) / 1000,
      acceleration: Math.round(acceleration * 1000) / 1000,
      isAccelerating: acceleration > 0.1,
      projectedScore7d: Math.round(projectedScore7d * 100) / 100,
    });
  }

  return velocities.sort((a, b) => b.rateOfChange - a.rateOfChange);
}

// Law 12: Treatment effectiveness consolidated into risk-treatments.service.ts
// Law 12: Monte Carlo consolidated into risk-quantification.service.ts

// ============================================================
// 7. Breach Probability
// ============================================================

/**
 * Estimate the probability of a KRI breaching high (50) or critical (75)
 * thresholds within the next N days, based on trend extrapolation and
 * Monte Carlo results.
 */
export async function getBreachProbability(
  tenantId: string,
  kriId: string,
  days: number = 30,
  highThreshold: number = 50,
  criticalThreshold: number = 75
): Promise<BreachProbability> {
  const schema = tenantSchema(tenantId);

  const history = await safeQuery(
    `SELECT score FROM "${schema}".kri_history
     WHERE kri_id = $1 AND tenant_id = $2
     ORDER BY recorded_at DESC LIMIT 90`,
    [kriId, tenantId]
  );

  const scores = history.rows.map((r: GenericRow) => parseFloat(r.score)).reverse();
  const currentScore = scores.length > 0 ? scores[scores.length - 1] : 0;

  // Quick Monte Carlo for breach counting
  const dailyChanges: number[] = [];
  for (let i = 1; i < scores.length; i++) {
    dailyChanges.push(scores[i] - scores[i - 1]);
  }

  const drift = dailyChanges.length > 0 ? mean(dailyChanges) : 0;
  const volatility = dailyChanges.length > 1 ? stdDev(dailyChanges) : 2;
  const rng = createRng(17);
  const totalSims = 500;
  let highBreaches = 0;
  let criticalBreaches = 0;
  let totalDaysToHigh = 0;
  let highReachedCount = 0;
  let totalDaysToCritical = 0;
  let criticalReachedCount = 0;

  for (let s = 0; s < totalSims; s++) {
    let score = currentScore;
    let hitHigh = false;
    let hitCritical = false;

    for (let d = 1; d <= days; d++) {
      score += normalRandom(rng, drift, volatility);
      score = Math.max(0, Math.min(100, score));

      if (!hitHigh && score >= highThreshold) {
        hitHigh = true;
        highBreaches++;
        totalDaysToHigh += d;
        highReachedCount++;
      }
      if (!hitCritical && score >= criticalThreshold) {
        hitCritical = true;
        criticalBreaches++;
        totalDaysToCritical += d;
        criticalReachedCount++;
      }
    }
  }

  return {
    kriId,
    currentScore,
    highThreshold,
    criticalThreshold,
    probabilityHigh: Math.round((highBreaches / totalSims) * 10000) / 100,
    probabilityCritical: Math.round((criticalBreaches / totalSims) * 10000) / 100,
    estimatedDaysToHigh: highReachedCount > 0 ? Math.round(totalDaysToHigh / highReachedCount) : null,
    estimatedDaysToCritical: criticalReachedCount > 0 ? Math.round(totalDaysToCritical / criticalReachedCount) : null,
  };
}

// ============================================================
// 8. Executive Summary
// ============================================================

/**
 * Generate a natural-language executive risk forecast summary suitable
 * for dashboards. Aggregates trend analysis, anomaly counts, and
 * accelerating risk counts into a concise narrative.
 */
export async function getExecutiveSummary(tenantId: string): Promise<ExecutiveSummary> {
  const [anomalies, velocities] = await Promise.all([
    detectAnomalies(tenantId),
    getRiskVelocity(tenantId),
  ]);

  const acceleratingRisks = velocities.filter((v) => v.isAccelerating);
  const avgRate = velocities.length > 0 ? mean(velocities.map((v) => v.rateOfChange)) : 0;

  let overallDirection: ExecutiveSummary["overallDirection"] = "stable";
  if (avgRate > 0.5) overallDirection = "worsening";
  else if (avgRate < -0.5) overallDirection = "improving";

  // Build top concerns list
  const topConcerns: string[] = [];

  if (anomalies.length > 0) {
    const criticalAnomalies = anomalies.filter((a) => a.severity === "critical");
    if (criticalAnomalies.length > 0) {
      topConcerns.push(
        `${criticalAnomalies.length} KRI(s) showing critical anomalies (z-score > 3): ${criticalAnomalies.slice(0, 3).map((a) => a.kriId).join(", ")}`
      );
    }
    if (anomalies.length > criticalAnomalies.length) {
      topConcerns.push(
        `${anomalies.length - criticalAnomalies.length} additional KRI(s) flagged with warning-level deviations`
      );
    }
  }

  if (acceleratingRisks.length > 0) {
    const topAccel = acceleratingRisks.slice(0, 3);
    topConcerns.push(
      `${acceleratingRisks.length} risk(s) accelerating: ${topAccel.map((r) => `${r.title} (+${r.rateOfChange.toFixed(2)}/day)`).join(", ")}`
    );
  }

  const highProjected = velocities.filter((v) => v.projectedScore7d >= 50 && v.currentScore < 50);
  if (highProjected.length > 0) {
    topConcerns.push(
      `${highProjected.length} risk(s) projected to enter high zone within 7 days`
    );
  }

  if (topConcerns.length === 0) {
    topConcerns.push("No immediate risk concerns detected across monitored KRIs");
  }

  // Generate natural-language forecast
  const directionLabel = overallDirection === "worsening" ? "upward (worsening)"
    : overallDirection === "improving" ? "downward (improving)"
    : "stable";
  const forecast = [
    `Overall risk posture is trending ${directionLabel}.`,
    anomalies.length > 0
      ? `${anomalies.length} anomalous KRI reading(s) detected requiring attention.`
      : "No statistical anomalies detected in current KRI readings.",
    acceleratingRisks.length > 0
      ? `${acceleratingRisks.length} risk(s) are accelerating and may require immediate intervention.`
      : "No risks are currently accelerating beyond normal variation.",
  ].join(" ");

  return {
    overallDirection,
    anomalyCount: anomalies.length,
    acceleratingRisks: acceleratingRisks.length,
    topConcerns,
    forecast,
    generatedAt: new Date().toISOString(),
  };
}
