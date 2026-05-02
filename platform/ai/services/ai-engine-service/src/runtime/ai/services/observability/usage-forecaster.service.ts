/**
 * AI Usage Forecaster — Projects token consumption and costs.
 *
 * Re-exports the base analytics forecaster (forecastUsage, getForecastSummary),
 * then adds enterprise capabilities:
 *   - getUsageForecast: comprehensive monthly forecast with per-agent breakdown
 *   - getUsageTrend: daily usage data for dashboard charts
 *   - checkBudgetAlerts: threshold-based budget alerting (75% warning, 90% critical)
 *
 * Uses linear regression on historical llm_usage_log data.
 */

// Re-export base analytics forecaster
export * from '../../../analytics/services/misc/usage-forecaster.service';

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '../../ports/platform.port';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UsageForecast {
  currentMonthTokens: number;
  currentMonthCost: number;
  projectedMonthTokens: number;
  projectedMonthlyCost: number;
  dailyAvgTokens: number;
  dailyAvgCost: number;
  trend: 'increasing' | 'stable' | 'decreasing';
  daysUntilBudgetExhausted: number | null;
  perAgentBreakdown: Array<{
    agentId: string;
    tokensUsed: number;
    costUsd: number;
    percentOfTotal: number;
  }>;
  alertLevel: 'normal' | 'warning' | 'critical';
  recommendations: string[];
}

export interface DailyUsagePoint {
  date: string;
  tokens: number;
  costUsd: number;
  calls: number;
}

export interface BudgetAlert {
  level: 'normal' | 'warning' | 'critical';
  budgetUsedPercent: number;
  budgetTotal: number | null;
  currentSpend: number;
  projectedMonthEnd: number;
  message: string;
}

// ---------------------------------------------------------------------------
// Linear regression helper
// ---------------------------------------------------------------------------

function linearRegression(points: Array<{ x: number; y: number }>): { slope: number; intercept: number } {
  const n = points.length;
  if (n < 2) return { slope: 0, intercept: points[0]?.y || 0 };

  const sumX = points.reduce((s, p) => s + p.x, 0);
  const sumY = points.reduce((s, p) => s + p.y, 0);
  const sumXY = points.reduce((s, p) => s + p.x * p.y, 0);
  const sumX2 = points.reduce((s, p) => s + p.x * p.x, 0);

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) return { slope: 0, intercept: sumY / n };

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  return {
    slope: isNaN(slope) ? 0 : slope,
    intercept: isNaN(intercept) ? 0 : intercept,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Load monthly budget from tenant_ai_config. Returns null if unset. */
async function getMonthlyBudget(schema: string): Promise<{ tokenBudget: number | null; costBudget: number | null }> {
  try {
    const result = await safeQuery(
      `SELECT monthly_token_budget, monthly_cost_budget
       FROM "${schema}".tenant_ai_config LIMIT 1`,
    );
    const row = getFirstRow(result) as GenericRow | null;
    return {
      tokenBudget: row?.monthly_token_budget ? Number(row.monthly_token_budget) : null,
      costBudget: row?.monthly_cost_budget ? Number(row.monthly_cost_budget) : null,
    };
  } catch {
    return { tokenBudget: null, costBudget: null };
  }
}

/** Classify trend from regression slope relative to daily average. */
function classifyTrend(slope: number, dailyAvg: number): 'increasing' | 'stable' | 'decreasing' {
  if (dailyAvg === 0) return 'stable';
  const relativeSlope = slope / dailyAvg;
  if (relativeSlope > 0.05) return 'increasing';
  if (relativeSlope < -0.05) return 'decreasing';
  return 'stable';
}

/** Generate actionable recommendations based on forecast data. */
function generateRecommendations(
  trend: 'increasing' | 'stable' | 'decreasing',
  alertLevel: 'normal' | 'warning' | 'critical',
  topAgent: string | null,
  daysUntilExhausted: number | null,
): string[] {
  const recs: string[] = [];

  if (alertLevel === 'critical') {
    recs.push('Budget is critically low. Consider increasing your monthly AI budget or reducing usage.');
  } else if (alertLevel === 'warning') {
    recs.push('Budget usage is above 75%. Monitor daily consumption closely.');
  }

  if (trend === 'increasing') {
    recs.push('Usage is trending upward. Review which agents are driving the increase.');
  }

  if (topAgent) {
    recs.push(`Agent "${topAgent}" is the highest consumer. Consider optimizing its prompt or enabling caching.`);
  }

  if (daysUntilExhausted !== null && daysUntilExhausted < 7) {
    recs.push(`At current rates, budget will be exhausted in ${daysUntilExhausted} day(s). Take immediate action.`);
  }

  if (recs.length === 0) {
    recs.push('Usage levels are normal. No action required.');
  }

  return recs;
}

// ---------------------------------------------------------------------------
// 1. getUsageForecast — main forecast with per-agent breakdown
// ---------------------------------------------------------------------------

/**
 * Compute a comprehensive usage forecast for the current month.
 * Includes per-agent breakdown, trend analysis, budget alerts, and recommendations.
 */
export async function getUsageForecast(tenantId: string): Promise<UsageForecast> {
  const schema = tenantSchema(tenantId);
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const remainingDays = daysInMonth - dayOfMonth;

  // Current month totals
  const monthResult = await safeQuery(
    `SELECT
       COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
       COALESCE(SUM(cost_usd), 0)::real AS total_cost
     FROM "${schema}".llm_usage_log
     WHERE created_at >= DATE_TRUNC('month', NOW())`,
  );
  const monthRow = getFirstRow(monthResult) as GenericRow | null;
  const currentMonthTokens = Number(monthRow?.total_tokens || 0);
  const currentMonthCost = Number(monthRow?.total_cost || 0);

  // Daily averages (from this month so far)
  const effectiveDays = Math.max(dayOfMonth, 1);
  const dailyAvgTokens = Math.round(currentMonthTokens / effectiveDays);
  const dailyAvgCost = Math.round((currentMonthCost / effectiveDays) * 100) / 100;

  // Daily breakdown for regression (last 30 days)
  const dailyResult = await safeQuery(
    `SELECT
       DATE(created_at) AS day,
       COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
       COALESCE(SUM(cost_usd), 0)::real AS cost
     FROM "${schema}".llm_usage_log
     WHERE created_at > NOW() - INTERVAL '30 days'
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
  );

  const dailyPoints = (dailyResult.rows as GenericRow[]).map((r, i) => ({
    x: i,
    y: Number(r.tokens || 0),
  }));
  const costPoints = (dailyResult.rows as GenericRow[]).map((r, i) => ({
    x: i,
    y: Number(r.cost || 0),
  }));

  const tokenRegression = linearRegression(dailyPoints);
  const costRegression = linearRegression(costPoints);

  // Project to end of month
  const projectedRemainingTokens = Math.max(
    0,
    remainingDays * (tokenRegression.slope * (dailyPoints.length + remainingDays / 2) + tokenRegression.intercept),
  );
  const projectedRemainingCost = Math.max(
    0,
    remainingDays * (costRegression.slope * (costPoints.length + remainingDays / 2) + costRegression.intercept),
  );

  // Simpler fallback: use daily average for projection if regression data is sparse
  const projectedMonthTokens = dailyPoints.length >= 5
    ? Math.round(currentMonthTokens + projectedRemainingTokens)
    : Math.round(dailyAvgTokens * daysInMonth);
  const projectedMonthlyCost = costPoints.length >= 5
    ? Math.round((currentMonthCost + projectedRemainingCost) * 100) / 100
    : Math.round(dailyAvgCost * daysInMonth * 100) / 100;

  // Trend
  const trend = classifyTrend(tokenRegression.slope, dailyAvgTokens);

  // Per-agent breakdown
  const agentResult = await safeQuery(
    `SELECT
       agent_id,
       COALESCE(SUM(total_tokens), 0)::bigint AS tokens_used,
       COALESCE(SUM(cost_usd), 0)::real AS cost_usd
     FROM "${schema}".llm_usage_log
     WHERE created_at >= DATE_TRUNC('month', NOW())
       AND agent_id IS NOT NULL
     GROUP BY agent_id
     ORDER BY tokens_used DESC`,
  );

  const totalTokensForPercent = Math.max(currentMonthTokens, 1);
  const perAgentBreakdown = (agentResult.rows as GenericRow[]).map((r) => ({
    agentId: String(r.agent_id || 'any'),
    tokensUsed: Number(r.tokens_used || 0),
    costUsd: Math.round(Number(r.cost_usd || 0) * 100) / 100,
    percentOfTotal: Math.round((Number(r.tokens_used || 0) / totalTokensForPercent) * 10000) / 100,
  }));

  // Budget check
  const budget = await getMonthlyBudget(schema);
  let daysUntilBudgetExhausted: number | null = null;
  let alertLevel: 'normal' | 'warning' | 'critical' = 'normal';

  if (budget.costBudget && budget.costBudget > 0) {
    const usedPercent = (currentMonthCost / budget.costBudget) * 100;
    if (usedPercent >= 90) alertLevel = 'critical';
    else if (usedPercent >= 75) alertLevel = 'warning';

    if (dailyAvgCost > 0) {
      const remainingBudget = budget.costBudget - currentMonthCost;
      daysUntilBudgetExhausted = remainingBudget > 0
        ? Math.floor(remainingBudget / dailyAvgCost)
        : 0;
    }
  } else if (budget.tokenBudget && budget.tokenBudget > 0) {
    const usedPercent = (currentMonthTokens / budget.tokenBudget) * 100;
    if (usedPercent >= 90) alertLevel = 'critical';
    else if (usedPercent >= 75) alertLevel = 'warning';

    if (dailyAvgTokens > 0) {
      const remainingBudget = budget.tokenBudget - currentMonthTokens;
      daysUntilBudgetExhausted = remainingBudget > 0
        ? Math.floor(remainingBudget / dailyAvgTokens)
        : 0;
    }
  }

  // Top agent for recommendations
  const topAgent = perAgentBreakdown.length > 0 ? perAgentBreakdown[0].agentId : null;
  const recommendations = generateRecommendations(trend, alertLevel, topAgent, daysUntilBudgetExhausted);

  return {
    currentMonthTokens,
    currentMonthCost: Math.round(currentMonthCost * 100) / 100,
    projectedMonthTokens,
    projectedMonthlyCost,
    dailyAvgTokens,
    dailyAvgCost,
    trend,
    daysUntilBudgetExhausted,
    perAgentBreakdown,
    alertLevel,
    recommendations,
  };
}

// ---------------------------------------------------------------------------
// 2. getUsageTrend — daily usage data for charts
// ---------------------------------------------------------------------------

/**
 * Get daily usage data points for the last N days.
 * Returns an array suitable for time-series chart rendering.
 */
export async function getUsageTrend(tenantId: string, daysBack = 30): Promise<DailyUsagePoint[]> {
  const schema = tenantSchema(tenantId);
  const clampedDays = Math.min(Math.max(daysBack, 1), 365);

  try {
    const result = await safeQuery(
      `SELECT
         DATE(created_at) AS day,
         COALESCE(SUM(total_tokens), 0)::bigint AS tokens,
         COALESCE(SUM(cost_usd), 0)::real AS cost_usd,
         COUNT(*)::int AS calls
       FROM "${schema}".llm_usage_log
       WHERE created_at > NOW() - make_interval(days => $1)
       GROUP BY DATE(created_at)
       ORDER BY day ASC`,
      [clampedDays],
    );

    return (result.rows as GenericRow[]).map((r) => ({
      date: String(r.day || ''),
      tokens: Number(r.tokens || 0),
      costUsd: Math.round(Number(r.cost_usd || 0) * 100) / 100,
      calls: Number(r.calls || 0),
    }));
  } catch (err: unknown) {
    logger.warn('[UsageForecaster] Failed to load usage trend', { tenantId, error: String(err) });
    return [];
  }
}

// ---------------------------------------------------------------------------
// 3. checkBudgetAlerts — threshold-based budget alerting
// ---------------------------------------------------------------------------

/**
 * Check current budget consumption against configured limits.
 * Returns an alert object with level (normal/warning/critical) and contextual message.
 */
export async function checkBudgetAlerts(tenantId: string): Promise<BudgetAlert> {
  const schema = tenantSchema(tenantId);

  // Current month spend
  const monthResult = await safeQuery(
    `SELECT
       COALESCE(SUM(cost_usd), 0)::real AS total_cost,
       COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens
     FROM "${schema}".llm_usage_log
     WHERE created_at >= DATE_TRUNC('month', NOW())`,
  );
  const monthRow = getFirstRow(monthResult) as GenericRow | null;
  const currentSpend = Number(monthRow?.total_cost || 0);
  const currentTokens = Number(monthRow?.total_tokens || 0);

  // Load budget configuration
  const budget = await getMonthlyBudget(schema);

  // Determine primary budget metric (cost takes precedence over tokens)
  let budgetTotal: number | null = null;
  let usedPercent = 0;

  if (budget.costBudget && budget.costBudget > 0) {
    budgetTotal = budget.costBudget;
    usedPercent = (currentSpend / budget.costBudget) * 100;
  } else if (budget.tokenBudget && budget.tokenBudget > 0) {
    budgetTotal = budget.tokenBudget;
    usedPercent = (currentTokens / budget.tokenBudget) * 100;
  }

  // Project to month end
  const now = new Date();
  const dayOfMonth = Math.max(now.getDate(), 1);
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthEnd = Math.round((currentSpend / dayOfMonth) * daysInMonth * 100) / 100;

  // Classify alert level
  let level: 'normal' | 'warning' | 'critical' = 'normal';
  let message = 'AI usage is within normal limits.';

  if (budgetTotal === null) {
    message = 'No AI budget configured. Consider setting a monthly budget in tenant AI configuration.';
  } else if (usedPercent >= 90) {
    level = 'critical';
    message = `AI budget is ${Math.round(usedPercent)}% consumed. Immediate attention required.`;
  } else if (usedPercent >= 75) {
    level = 'warning';
    message = `AI budget is ${Math.round(usedPercent)}% consumed. Monitor usage closely.`;
  } else {
    message = `AI budget is ${Math.round(usedPercent)}% consumed. On track for the month.`;
  }

  return {
    level,
    budgetUsedPercent: Math.round(usedPercent * 100) / 100,
    budgetTotal,
    currentSpend: Math.round(currentSpend * 100) / 100,
    projectedMonthEnd,
    message,
  };
}
