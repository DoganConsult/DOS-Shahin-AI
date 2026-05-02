// ============================================
// Governance AI — Health Intelligence Service
// AI-powered score explanation, health dashboard,
// trend analysis, and governance narrative generation.
// Uses Claude AI for rich contextual explanations
// with rule-based fallbacks for resilience.
// ============================================

import { v4 as _uuid } from 'uuid';
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { claudeJSON } from '../../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import { logger } from '../../ports/logger.port';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';
import { emitHealthSnapshotCreated, emitScoreRecalculated } from '../../events/governance_ai.publishers';

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface ScoreExplanationResult {
  explanation_id: string;
  overall_score: number;
  previous_score: number;
  delta_score: number;
  top_negative_drivers: ScoreDriver[];
  top_positive_drivers: ScoreDriver[];
  recommendation_summary: string;
  explanation_text: string;
}

export interface ScoreDriver {
  dimension: string;
  score: number;
  grade: string;
  impact: 'positive' | 'negative';
}

export interface AiScoreExplanation {
  explanation: string;
  factors: AiScoreFactor[];
  improvementActions: AiImprovementAction[];
  confidence: number;
}

export interface AiScoreFactor {
  factor: string;
  direction: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface AiImprovementAction {
  action: string;
  expectedImpact: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
}

export interface HealthDashboard {
  overallHealth: {
    score: number;
    grade: string;
    trend: 'improving' | 'stable' | 'degrading';
  };
  dimensions: HealthDimension[];
  alerts: HealthAlert[];
  narrative: string;
  computedAt: string;
}

export interface HealthDimension {
  dimension: string;
  score: number;
  grade: string;
  weight: number;
  trend: 'improving' | 'stable' | 'degrading';
  previousScore: number | null;
  details: Record<string, number>;
}

export interface HealthAlert {
  alertType: 'degrading' | 'critical' | 'breach' | 'stale_data';
  dimension: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  currentScore: number;
  previousScore: number | null;
}

export interface HealthTrendPoint {
  date: string;
  overallScore: number;
  overallGrade: string;
  dimensions: Record<string, number>;
}

// ---------------------------------------------------------------------------
// 1. Get Latest Score Explanation
// ---------------------------------------------------------------------------

/**
 * Retrieve the most recent AI-explained governance score. If no stored
 * explanation exists, generates one on the fly using Claude AI.
 */
export async function getLatestScoreExplanation(
  tenantId: string,
  scoreType?: string,
): Promise<ScoreExplanationResult | null> {
  const schema = tenantSchema(tenantId);

  // Attempt to load stored explanation
  const storedRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT * FROM "${schema}".governance_score_explanations
    WHERE tenant_id = $1
    ORDER BY created_at DESC LIMIT 1
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_score_explanations' });

  if (storedRes.rows[0]) {
    const row = storedRes.rows[0];
    return {

      explanation_id: row.id,
      overall_score: parseFloat((row as any).overall_score),
      previous_score: parseFloat((row as any).previous_score),
      delta_score: parseFloat((row as any).delta_score),
      top_negative_drivers: parseJsonField(row.top_negative_drivers_json) as ScoreDriver[],
      top_positive_drivers: parseJsonField(row.top_positive_drivers_json) as ScoreDriver[],

      recommendation_summary: row.recommendation_summary,

      explanation_text: row.explanation_text,
    };
  }

  // No stored explanation — generate on the fly
  return generateScoreExplanation(tenantId, scoreType);
}

// ---------------------------------------------------------------------------
// 2. Generate Score Explanation (AI-powered)
// ---------------------------------------------------------------------------

/**
 * Generate a comprehensive AI-powered explanation for the current governance
 * health score. Gathers dimension data, recent changes, and contributing
 * factors, then uses Claude AI for a rich contextual narrative.
 */
export async function generateScoreExplanation(
  tenantId: string,
  scoreType?: string,
  scoreValue?: number,
  context?: Record<string, unknown>,
): Promise<ScoreExplanationResult | null> {
  const schema = tenantSchema(tenantId);

  // 1. Get current health score
  let currentHealth: any = null;
  try {
    const { getLatestHealthScore } = await import('../../../governance/services/governance/governance-health.service.js');
    currentHealth = await getLatestHealthScore(tenantId);
  } catch { /* service may not be available */ }

  if (!currentHealth && !scoreValue) return null;

  const overallScore = scoreValue ?? currentHealth?.overall_score ?? 0;
  const dimensions: unknown[] = currentHealth?.dimensions || [];

  // 2. Get previous score for delta calculation
  const prevRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT overall_score FROM "${schema}".governance_score_explanations
    WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 1
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_score_explanations' });
  const previousScore = prevRes.rows[0]?.overall_score != null
    ? parseFloat((prevRes as any).rows[0].overall_score) : overallScore;
  const delta = Math.round((overallScore - previousScore) * 100) / 100;

  // 3. Identify positive and negative drivers
  const negDrivers = dimensions
    .filter((d: GenericRow) => d.grade === 'red' || d.score < 60)
    .sort((a: GenericRow, b: GenericRow) => a.score - b.score)
    .slice(0, 5)
    .map((d: GenericRow) => ({ dimension: d.dimension, score: d.score, grade: d.grade, impact: 'negative' as const }));

  const posDrivers = dimensions
    .filter((d: GenericRow) => d.grade === 'green' && d.score >= 80)
    .sort((a: GenericRow, b: GenericRow) => b.score - a.score)
    .slice(0, 5)
    .map((d: GenericRow) => ({ dimension: d.dimension, score: d.score, grade: d.grade, impact: 'positive' as const }));

  // 4. Gather active signal counts for context
  const signalCounts = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT signal_type, COUNT(*)::int AS count
    FROM "${schema}".governance_signals
    WHERE tenant_id = $1 AND status NOT IN ('resolved','archived')
    GROUP BY signal_type ORDER BY count DESC LIMIT 10
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_signals' });

  // 5. Load recent score history for trend context (last 30 days)
  const historyRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT overall_score, computed_at
    FROM "${schema}".governance_health_scores
    WHERE tenant_id = $1 AND computed_at >= NOW() - INTERVAL '30 days'
    ORDER BY computed_at DESC LIMIT 30
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_health_scores' });
  const historicalAvg = historyRes.rows.length > 0
    ? historyRes.rows.reduce((s: number, r: Record<string, unknown>) => s + parseFloat((r as any).overall_score), 0) / historyRes.rows.length
    : overallScore;

  // 6. Attempt AI-powered explanation
  let recSummary: string;
  let explanation: string;

  try {
    const aiContext = {
      overallScore,
      previousScore,
      delta,
      historicalAverage: Math.round(historicalAvg * 10) / 10,
      negativeDrivers: negDrivers,
      positiveDrivers: posDrivers,
      activeSignals: signalCounts.rows,
      dimensionCount: dimensions.length,
      scoreType: scoreType || 'governance_health',
      additionalContext: context || {},
    };

    const aiResult = await claudeJSON<{
      explanation: string;
      recommendationSummary: string;
      factors: AiScoreFactor[];
      improvementActions: AiImprovementAction[];
    }>({
      tenantId,
      agentId: 'governance-health-intelligence',
      decisionType: 'score_explanation',
      systemPrompt: `You are an expert GRC (Governance, Risk, Compliance) analyst. Generate a clear, actionable explanation for a governance health score. Be specific about what is driving the score and what can be done to improve it. Respond in valid JSON with keys: explanation (string), recommendationSummary (string), factors (array of {factor, direction, weight, description}), improvementActions (array of {action, expectedImpact (1-10), effort (low/medium/high), priority (1-5)}).`,
      userMessage: `Analyze this governance health score and provide a comprehensive explanation:\n${JSON.stringify(aiContext, null, 2)}`,
      maxTokens: 2048,
      temperature: 0.3,
    });

    explanation = aiResult.explanation || buildExplanationText(overallScore, delta, negDrivers, posDrivers, dimensions);
    recSummary = aiResult.recommendationSummary || buildRecommendationSummary(negDrivers, signalCounts.rows, delta);

    logger.info('[HealthIntelligence] AI explanation generated', { tenantId, score: overallScore });
  } catch (aiErr) {
    // Fallback to rule-based explanation
    logger.warn('[HealthIntelligence] AI explanation failed, using rule-based fallback', {
      tenantId, error: toErrorMessage(aiErr),
    });
    recSummary = buildRecommendationSummary(negDrivers, signalCounts.rows, delta);
    explanation = buildExplanationText(overallScore, delta, negDrivers, posDrivers, dimensions);
  }

  // 7. Persist explanation for future retrieval
  const res = await safeQuery(`
    INSERT INTO "${schema}".governance_score_explanations
      (tenant_id, score_run_id, overall_score, previous_score, delta_score,
       top_negative_drivers_json, top_positive_drivers_json,
       recommendation_summary, explanation_text)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id
  `, [
    tenantId, currentHealth?.score_id || 'manual',
    overallScore, previousScore, delta,
    JSON.stringify(negDrivers), JSON.stringify(posDrivers),
    recSummary, explanation,
  ]);

  // Publish score recalculated event for analytics and observability
  emitScoreRecalculated(tenantId, res.rows[0]?.id, {
    overallScore,
    previousScore,
    delta,
  });

  return {
    explanation_id: res.rows[0]?.id,
    overall_score: overallScore,
    previous_score: previousScore,
    delta_score: delta,
    top_negative_drivers: negDrivers,
    top_positive_drivers: posDrivers,
    recommendation_summary: recSummary,
    explanation_text: explanation,
  };
}

// ---------------------------------------------------------------------------
// 3. Health Dashboard
// ---------------------------------------------------------------------------

/**
 * Comprehensive health overview across all governance dimensions. Queries
 * current + historical data, identifies degrading areas, and uses Claude AI
 * for an overall health narrative.
 */
export async function getHealthDashboard(tenantId: string): Promise<HealthDashboard> {
  const schema = tenantSchema(tenantId);
  const computedAt = new Date().toISOString();

  // 1. Get latest health score with dimensions
  let latestHealth: any = null;
  try {
    const { getLatestHealthScore } = await import('../../../governance/services/governance/governance-health.service.js');
    latestHealth = await getLatestHealthScore(tenantId);
  } catch { /* service may not be available */ }

  const overallScore = latestHealth?.overall_score ?? 0;
  const overallGrade = latestHealth?.overall_grade ?? gradeScore(overallScore);
  const currentDimensions: unknown[] = latestHealth?.dimensions || [];

  // 2. Get 30-day historical scores for trend analysis
  const historyRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT overall_score, overall_grade, dimension_scores, computed_at
    FROM "${schema}".governance_health_scores
    WHERE tenant_id = $1 AND computed_at >= NOW() - INTERVAL '30 days'
    ORDER BY computed_at ASC
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_health_scores' });

  // 3. Calculate trends per dimension
  const dimensionTrends = computeDimensionTrends(currentDimensions, historyRes.rows);
  const overallTrend = computeOverallTrend(historyRes.rows);

  // 4. Build dimension results with trends
  const dimensions: HealthDimension[] = currentDimensions.map((d: GenericRow) => {
    const trend = dimensionTrends[d.dimension] || { trend: 'stable', previousScore: null };
    return {
      dimension: d.dimension,
      score: d.score,
      grade: d.grade,
      weight: d.weight,
      trend: trend.trend,
      previousScore: trend.previousScore,
      details: d.details || {},
    };
  });

  // 5. Identify alerts (degrading, critical, breached, stale data)
  const alerts: HealthAlert[] = [];

  for (const dim of dimensions) {
    if (dim.grade === 'red') {
      alerts.push({
        alertType: 'critical',
        dimension: dim.dimension,
        message: `${formatDimensionName(dim.dimension)} is critically low at ${dim.score.toFixed(0)}/100`,
        severity: 'critical',
        currentScore: dim.score,
        previousScore: dim.previousScore,
      });
    }
    if (dim.trend === 'degrading' && dim.previousScore !== null) {
      alerts.push({
        alertType: 'degrading',
        dimension: dim.dimension,
        message: `${formatDimensionName(dim.dimension)} declining from ${dim.previousScore.toFixed(0)} to ${dim.score.toFixed(0)} over 30 days`,
        severity: dim.grade === 'red' ? 'critical' : 'high',
        currentScore: dim.score,
        previousScore: dim.previousScore,
      });
    }
  }

  // Check for stale data (no health score computed in 7+ days)
  const latestComputedAt = historyRes.rows.length > 0
    ? new Date((historyRes as any).rows[historyRes.rows.length - 1].computed_at)
    : null;
  if (!latestComputedAt || (Date.now() - latestComputedAt.getTime()) > 7 * 24 * 60 * 60 * 1000) {
    alerts.push({
      alertType: 'stale_data',
      dimension: 'overall',
      message: 'Governance health score has not been computed in over 7 days. Data may be stale.',
      severity: 'medium',
      currentScore: overallScore,
      previousScore: null,
    });
  }

  // Sort alerts by severity
  const severityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));

  // 6. Generate AI narrative
  let narrative: string;
  try {
    const narrativeContext = {
      overallScore,
      overallGrade,
      overallTrend,
      dimensions: dimensions.map(d => ({
        name: d.dimension, score: d.score, grade: d.grade, trend: d.trend,
      })),
      alertCount: alerts.length,
      criticalAlerts: alerts.filter(a => a.severity === 'critical').length,
      degradingDimensions: dimensions.filter(d => d.trend === 'degrading').map(d => d.dimension),
    };

    const aiNarrative = await claudeJSON<{ narrative: string }>({
      tenantId,
      agentId: 'governance-health-intelligence',
      decisionType: 'health_dashboard_narrative',
      systemPrompt: `You are an expert GRC analyst writing a concise governance health narrative for an executive dashboard. Write 3-5 sentences that summarize the current governance health posture, highlight concerns, and suggest the most important next step. Be direct and actionable. Respond in valid JSON with key: narrative (string).`,
      userMessage: `Generate a governance health narrative:\n${JSON.stringify(narrativeContext, null, 2)}`,
      maxTokens: 512,
      temperature: 0.3,
    });
    narrative = aiNarrative.narrative || buildRuleBasedNarrative(overallScore, overallGrade, overallTrend, dimensions, alerts);
  } catch (aiErr) {
    logger.warn('[HealthIntelligence] Dashboard narrative AI failed, using rule-based fallback', {
      tenantId, error: toErrorMessage(aiErr),
    });
    narrative = buildRuleBasedNarrative(overallScore, overallGrade, overallTrend, dimensions, alerts);
  }

  // Publish health snapshot created event for cross-module integration
  emitHealthSnapshotCreated(tenantId, `health-${Date.now()}`, {
    overallScore,
    grade: overallGrade,
    trend: overallTrend,
  });

  return {
    overallHealth: { score: overallScore, grade: overallGrade, trend: overallTrend },
    dimensions,
    alerts,
    narrative,
    computedAt,
  };
}

// ---------------------------------------------------------------------------
// 4. Health Trend
// ---------------------------------------------------------------------------

/**
 * Returns health score data points over a specified time range, optionally
 * filtered to a single dimension.
 */
export async function getHealthTrend(
  tenantId: string,
  dimension?: string,
  timeRange: number = 30,
): Promise<HealthTrendPoint[]> {
  const schema = tenantSchema(tenantId);

  const historyRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT overall_score, overall_grade, dimension_scores, computed_at
    FROM "${schema}".governance_health_scores
    WHERE tenant_id = $1 AND computed_at >= NOW() - ($2 || ' days')::interval
    ORDER BY computed_at ASC LIMIT 200
  `, [tenantId, timeRange]), { tenantId: tenantId, operation: 'query governance_health_scores' });

  return historyRes.rows.map((row: GenericRow) => {
    const dimScores = typeof row.dimension_scores === 'string'
      ? JSON.parse(row.dimension_scores) : row.dimension_scores || {};

    // If filtering by dimension, only include that dimension
    const filteredDims = dimension
      ? { [dimension]: dimScores[dimension] ?? null }
      : dimScores;

    return {
      date: row.computed_at,
      overallScore: parseFloat(row.overall_score),
      overallGrade: row.overall_grade,
      dimensions: filteredDims,
    };
  });
}

// ---------------------------------------------------------------------------
// Private Helpers
// ---------------------------------------------------------------------------

function parseJsonField(value: unknown): unknown[] {
  if (!value) return [];
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return []; }
  }
  return Array.isArray(value) ? value : [];
}

function gradeScore(score: number, greenMin = 80, yellowMin = 60): string {
  if (score >= greenMin) return 'green';
  if (score >= yellowMin) return 'yellow';
  return 'red';
}

function formatDimensionName(dim: string): string {
  return dim.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function computeOverallTrend(history: unknown[]): 'improving' | 'stable' | 'degrading' {
  if (history.length < 2) return 'stable';

  // Compare first third vs last third averages
  const third = Math.max(1, Math.floor(history.length / 3));

  const earlyAvg = history.slice(0, third).reduce((s, r) => (s as any) + parseFloat(r.overall_score), 0) / third;

  const lateAvg = history.slice(-third).reduce((s, r) => (s as any) + parseFloat(r.overall_score), 0) / third;
  const diff = lateAvg - earlyAvg;

  if (diff > 3) return 'improving';
  if (diff < -3) return 'degrading';
  return 'stable';
}

function computeDimensionTrends(
  current: unknown[],
  history: unknown[],
): Record<string, { trend: 'improving' | 'stable' | 'degrading'; previousScore: number | null }> {
  const result: Record<string, { trend: 'improving' | 'stable' | 'degrading'; previousScore: number | null }> = {};

  if (history.length < 2) {
    for (const d of current) {

      result[d.dimension] = { trend: 'stable', previousScore: null };
    }
    return result;
  }

  // Get the earliest scores for comparison
  const earliest = history[0];

  const earliestDims = typeof earliest.dimension_scores === 'string'

    ? JSON.parse(earliest.dimension_scores) : earliest.dimension_scores || {};

  for (const d of current) {

    const prevScore = earliestDims[d.dimension] != null ? parseFloat(earliestDims[d.dimension]) : null;
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (prevScore !== null) {

      const diff = d.score - prevScore;
      if (diff > 5) trend = 'improving';
      else if (diff < -5) trend = 'degrading';
    }

    result[d.dimension] = { trend, previousScore: prevScore };
  }

  return result;
}

function buildRecommendationSummary(negDrivers: unknown[], signalCounts: unknown[], delta: number): string {
  const parts: string[] = [];
  if (delta < 0) {
    parts.push(`Governance score declined by ${Math.abs(delta).toFixed(1)} points.`);
  } else if (delta > 0) {
    parts.push(`Governance score improved by ${delta.toFixed(1)} points.`);
  } else {
    parts.push('Governance score unchanged since last assessment.');
  }
  if (negDrivers.length > 0) {

    const dims = negDrivers.map(d => d.dimension).join(', ');
    parts.push(`Priority areas requiring attention: ${dims}.`);
  }
  if (signalCounts.length > 0) {
    const topSignal = signalCounts[0];

    parts.push(`Most frequent active signal: ${topSignal.signal_type} (${topSignal.count} occurrences).`);
  }
  return parts.join(' ');
}

function buildExplanationText(
  score: number, delta: number, neg: unknown[], pos: unknown[], all: unknown[],
): string {
  const lines: string[] = [];
  lines.push(`Current governance health score: ${score.toFixed(1)}/100.`);
  if (delta !== 0) {
    lines.push(`Change from previous assessment: ${delta > 0 ? '+' : ''}${delta.toFixed(1)} points.`);
  }
  if (all.length > 0) {
    lines.push(`Assessed across ${all.length} governance dimensions.`);
  }
  if (neg.length > 0) {

    lines.push(`Underperforming dimensions: ${neg.map(d => `${d.dimension} (${d.score.toFixed(0)})`).join(', ')}.`);
  }
  if (pos.length > 0) {

    lines.push(`Strong dimensions: ${pos.map(d => `${d.dimension} (${d.score.toFixed(0)})`).join(', ')}.`);
  }
  return lines.join('\n');
}

function buildRuleBasedNarrative(
  score: number,
  grade: string,
  trend: string,
  dimensions: HealthDimension[],
  alerts: HealthAlert[],
): string {
  const parts: string[] = [];

  // Overall posture
  if (grade === 'green') {
    parts.push(`Governance health is strong at ${score.toFixed(0)}/100.`);
  } else if (grade === 'yellow') {
    parts.push(`Governance health is at ${score.toFixed(0)}/100, indicating areas needing attention.`);
  } else {
    parts.push(`Governance health is critically low at ${score.toFixed(0)}/100 and requires immediate leadership attention.`);
  }

  // Trend
  if (trend === 'improving') {
    parts.push('The overall trend is positive over the past 30 days.');
  } else if (trend === 'degrading') {
    parts.push('The overall trend is declining and should be investigated.');
  }

  // Top concern
  const criticalDims = dimensions.filter(d => d.grade === 'red');
  if (criticalDims.length > 0) {
    const names = criticalDims.map(d => formatDimensionName(d.dimension)).join(', ');
    parts.push(`Critical dimensions: ${names}.`);
  }

  // Degrading dimensions
  const degrading = dimensions.filter(d => d.trend === 'degrading');
  if (degrading.length > 0 && degrading.length !== criticalDims.length) {
    const names = degrading.map(d => formatDimensionName(d.dimension)).join(', ');
    parts.push(`Declining areas: ${names}.`);
  }

  // Alert count
  if (alerts.length > 0) {
    parts.push(`${alerts.length} active alert(s) require review.`);
  }

  return parts.join(' ');
}
