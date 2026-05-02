/**
 * Analytics Claude AI Service -- AI-powered trend analysis, anomaly detection,
 * natural language KPI summaries, and predictive narratives.
 *
 * MP-12 SS8: Allowed AI participation:
 *   - Anomaly explanation
 *   - Trend narration
 *   - Insight summarization
 *   - Benchmark interpretation
 *
 * MP-12 SS8.2: Restricted AI behavior:
 *   - Silent mutation of certified metrics
 *   - Protected publish actions outside workflow + DAuth
 *   - Hidden scope reclassification
 *
 * Uses the centralized Claude client from the AI module.
 * All AI operations are logged for audit trail (Law 12).
 *
 * @owner analytics
 * @module analytics
 */

import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';

// ── AI Response Types ──────────────────────────────────────────────────

export interface TrendNarrationResult {
  narrative: string;
  keyInsights: string[];
  trendDirection: 'improving' | 'declining' | 'stable' | 'volatile';
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface AnomalyExplanationResult {
  explanation: string;
  possibleCauses: string[];
  suggestedActions: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface KpiSummaryResult {
  executiveSummary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  overallHealthAssessment: string;
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface BenchmarkInterpretationResult {
  interpretation: string;
  strengths: string[];
  weaknesses: string[];
  industryComparison: string;
  improvementAreas: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

export interface PredictiveNarrativeResult {
  narrative: string;
  riskFactors: string[];
  opportunities: string[];
  timelineAssessment: string;
  actionPlan: string[];
  confidence: number;
  modelUsed: string;
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number };
}

// ── Claude Client Lazy Import ──────────────────────────────────────────

/**
 * Get the Claude client lazily to avoid circular imports.
 * Returns null if AI is not configured.
 */
async function getClaude(): Promise<{
  createChatCompletion: typeof import('../../../../config/claude-client').createChatCompletion;
  CLAUDE_MODEL: string;
} | null> {
  try {
    const mod = await import('../../../../config/claude-client.js');
    if (!mod.getClaudeClient()) return null;
    return { createChatCompletion: mod.createChatCompletion, CLAUDE_MODEL: mod.CLAUDE_MODEL };
  } catch {
    logger.warn('[analytics-ai] Claude client not available');
    return null;
  }
}

/**
 * Log AI invocation to audit trail for compliance with Law 12.
 */
async function logAiInvocation(
  tenantId: string,
  operation: string,
  tokensUsed: { input?: number; output?: number; inputTokens?: number; outputTokens?: number },
): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `INSERT INTO "${schema}".agrc_event_log (event_type, entity_type, payload, created_at)
       VALUES ($1, $2, $3, NOW())`,
      [
        'analytics.ai_invocation',
        'analytics',
        JSON.stringify({ operation, tokensUsed, timestamp: new Date().toISOString() }),
      ],
    );
  } catch {
    // Audit logging is best-effort
  }
}

// ── Core AI Functions ──────────────────────────────────────────────────

/**
 * Generate a natural language narration of KPI trends over a time period.
 *
 * MP-12 SS8.1: Trend narration is an allowed AI participation.
 */
export async function generateTrendNarration(
  tenantId: string,
  kpiData: {
    metricName: string;
    dataPoints: { date: string; value: number }[];
    currentValue: number;
    previousValue: number;
    targetValue?: number;
  },
): Promise<TrendNarrationResult> {
  const claude = await getClaude();

  const fallback: TrendNarrationResult = {
    narrative: `${kpiData.metricName} is currently at ${kpiData.currentValue}. ` +
      `Previous value was ${kpiData.previousValue}. ` +
      (kpiData.currentValue > kpiData.previousValue ? 'The trend shows improvement.' :
        kpiData.currentValue < kpiData.previousValue ? 'The trend shows a decline.' : 'The metric is stable.'),
    keyInsights: [`Current value: ${kpiData.currentValue}`, `Change: ${kpiData.currentValue - kpiData.previousValue}`],
    trendDirection: kpiData.currentValue > kpiData.previousValue ? 'improving' :
      kpiData.currentValue < kpiData.previousValue ? 'declining' : 'stable',
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  if (!claude) return fallback;

  try {
    const systemPrompt = `You are an enterprise GRC analytics advisor. Analyze KPI trend data and provide clear, actionable insights. Be concise and factual. Output valid JSON only.`;

    const userPrompt = `Analyze this KPI trend data and provide a narration:
Metric: ${kpiData.metricName}
Current Value: ${kpiData.currentValue}
Previous Value: ${kpiData.previousValue}
${kpiData.targetValue ? `Target Value: ${kpiData.targetValue}` : ''}
Data Points (last ${kpiData.dataPoints.length}): ${JSON.stringify(kpiData.dataPoints.slice(-10))}

Respond with JSON:
{
  "narrative": "2-3 sentence natural language summary",
  "keyInsights": ["insight1", "insight2", "insight3"],
  "trendDirection": "improving|declining|stable|volatile"
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1024 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'generateTrendNarration', result.usage);

    return {
      narrative: parsed.narrative || fallback.narrative,
      keyInsights: parsed.keyInsights || fallback.keyInsights,
      trendDirection: parsed.trendDirection || fallback.trendDirection,
      confidence: 0.85,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[analytics-ai] generateTrendNarration failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Explain a detected anomaly in analytics metrics.
 *
 * MP-12 SS8.1: Anomaly explanation is an allowed AI participation.
 */
export async function explainAnomaly(
  tenantId: string,
  anomalyData: {
    metricCode: string;
    currentValue: number;
    expectedRange: { min: number; max: number };
    historicalAverage: number;
    recentChanges: string[];
    relatedModuleEvents: string[];
  },
): Promise<AnomalyExplanationResult> {
  const deviation = Math.abs(anomalyData.currentValue - anomalyData.historicalAverage);
  const deviationPct = anomalyData.historicalAverage > 0
    ? Math.round((deviation / anomalyData.historicalAverage) * 100)
    : 0;
  const severityFromDeviation = deviationPct > 50 ? 'critical' : deviationPct > 30 ? 'high' : deviationPct > 15 ? 'medium' : 'low';

  const fallback: AnomalyExplanationResult = {
    explanation: `Metric ${anomalyData.metricCode} deviates ${deviationPct}% from the historical average of ${anomalyData.historicalAverage}. Current value: ${anomalyData.currentValue}. Expected range: ${anomalyData.expectedRange.min}-${anomalyData.expectedRange.max}.`,
    possibleCauses: anomalyData.recentChanges.length > 0
      ? anomalyData.recentChanges
      : ['Insufficient data to determine root cause'],
    suggestedActions: ['Investigate recent changes in related modules', 'Review data source freshness'],
    severity: severityFromDeviation,
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are an enterprise GRC anomaly analyst. Analyze metric anomalies and provide root cause analysis. Be precise and actionable. Output valid JSON only.`;

    const userPrompt = `Explain this metric anomaly:
Metric: ${anomalyData.metricCode}
Current Value: ${anomalyData.currentValue}
Expected Range: ${anomalyData.expectedRange.min} - ${anomalyData.expectedRange.max}
Historical Average: ${anomalyData.historicalAverage}
Deviation: ${deviationPct}%
Recent Module Changes: ${JSON.stringify(anomalyData.recentChanges)}
Related Module Events: ${JSON.stringify(anomalyData.relatedModuleEvents)}

Respond with JSON:
{
  "explanation": "clear explanation",
  "possibleCauses": ["cause1", "cause2"],
  "suggestedActions": ["action1", "action2"],
  "severity": "critical|high|medium|low"
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1024 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'explainAnomaly', result.usage);

    return {
      explanation: parsed.explanation || fallback.explanation,
      possibleCauses: parsed.possibleCauses || fallback.possibleCauses,
      suggestedActions: parsed.suggestedActions || fallback.suggestedActions,
      severity: parsed.severity || severityFromDeviation,
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[analytics-ai] explainAnomaly failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Generate an executive-level KPI summary for tenant dashboards.
 *
 * MP-12 SS8.1: Insight summarization is an allowed AI participation.
 */
export async function generateKpiSummary(
  tenantId: string,
  kpis: {
    complianceScore: number;
    riskScore: number;
    evidenceCoverage: number;
    remediationClosureRate: number;
    vendorHealthScore: number;
    vendorRiskExposure: number;
  },
): Promise<KpiSummaryResult> {
  const overallHealth = kpis.complianceScore >= 80 && kpis.riskScore <= 20 && kpis.evidenceCoverage >= 70
    ? 'Strong' : kpis.complianceScore >= 60 && kpis.riskScore <= 40 ? 'Moderate' : 'Needs Attention';

  const fallback: KpiSummaryResult = {
    executiveSummary: `GRC program health is ${overallHealth}. Compliance score: ${kpis.complianceScore}%, Risk exposure: ${kpis.riskScore}%, Evidence coverage: ${kpis.evidenceCoverage}%, Remediation closure: ${kpis.remediationClosureRate}%.`,
    highlights: kpis.complianceScore >= 80 ? ['Compliance score above target'] : [],
    concerns: [
      ...(kpis.riskScore > 30 ? [`Elevated risk score (${kpis.riskScore}%)`] : []),
      ...(kpis.evidenceCoverage < 70 ? [`Evidence coverage below threshold (${kpis.evidenceCoverage}%)`] : []),
      ...(kpis.remediationClosureRate < 60 ? [`Low remediation closure rate (${kpis.remediationClosureRate}%)`] : []),
    ],
    recommendations: ['Review highest-risk items', 'Ensure evidence collection is on track'],
    overallHealthAssessment: overallHealth,
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are an enterprise GRC executive advisor. Summarize KPI data into actionable executive insights. Be clear, concise, and focused on business outcomes. Output valid JSON only.`;

    const userPrompt = `Generate an executive KPI summary:
Compliance Score: ${kpis.complianceScore}%
Risk Score: ${kpis.riskScore}%
Evidence Coverage: ${kpis.evidenceCoverage}%
Remediation Closure Rate: ${kpis.remediationClosureRate}%
Vendor Health Score: ${kpis.vendorHealthScore}%
Vendor Risk Exposure: ${kpis.vendorRiskExposure}%

Respond with JSON:
{
  "executiveSummary": "2-3 sentence summary",
  "highlights": ["positive1", "positive2"],
  "concerns": ["concern1", "concern2"],
  "recommendations": ["rec1", "rec2"],
  "overallHealthAssessment": "Strong|Moderate|Needs Attention|Critical"
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1024 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'generateKpiSummary', result.usage);

    return {
      executiveSummary: parsed.executiveSummary || fallback.executiveSummary,
      highlights: parsed.highlights || fallback.highlights,
      concerns: parsed.concerns || fallback.concerns,
      recommendations: parsed.recommendations || fallback.recommendations,
      overallHealthAssessment: parsed.overallHealthAssessment || overallHealth,
      confidence: 0.85,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[analytics-ai] generateKpiSummary failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Interpret benchmark data comparing tenant metrics against industry standards.
 *
 * MP-12 SS8.1: Benchmark interpretation is an allowed AI participation.
 */
export async function interpretBenchmark(
  tenantId: string,
  benchmarkData: {
    tenantMetrics: Record<string, number>;
    industryAverages: Record<string, number>;
    industryMedians: Record<string, number>;
    peerGroupSize: number;
    industry: string;
  },
): Promise<BenchmarkInterpretationResult> {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  for (const [key, value] of Object.entries(benchmarkData.tenantMetrics)) {
    const avg = benchmarkData.industryAverages[key];
    if (avg !== undefined) {
      if (value > avg * 1.1) strengths.push(`${key}: ${value} (above industry average ${avg})`);
      else if (value < avg * 0.9) weaknesses.push(`${key}: ${value} (below industry average ${avg})`);
    }
  }

  const fallback: BenchmarkInterpretationResult = {
    interpretation: `Compared against ${benchmarkData.peerGroupSize} peers in ${benchmarkData.industry}. ${strengths.length} areas above average, ${weaknesses.length} areas below average.`,
    strengths,
    weaknesses,
    industryComparison: `Benchmarked against ${benchmarkData.peerGroupSize} organizations in the ${benchmarkData.industry} sector.`,
    improvementAreas: weaknesses.map(w => `Improve ${w.split(':')[0]}`),
    confidence: 0.3,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are a GRC benchmarking analyst. Interpret benchmark comparisons for enterprise decision-makers. Be specific about relative positioning and provide actionable improvement suggestions. Output valid JSON only.`;

    const userPrompt = `Interpret these benchmark results:
Industry: ${benchmarkData.industry}
Peer Group Size: ${benchmarkData.peerGroupSize}
Tenant Metrics: ${JSON.stringify(benchmarkData.tenantMetrics)}
Industry Averages: ${JSON.stringify(benchmarkData.industryAverages)}
Industry Medians: ${JSON.stringify(benchmarkData.industryMedians)}

Respond with JSON:
{
  "interpretation": "concise interpretation",
  "strengths": ["strength1", "strength2"],
  "weaknesses": ["weakness1", "weakness2"],
  "industryComparison": "comparison statement",
  "improvementAreas": ["area1", "area2"]
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1024 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'interpretBenchmark', result.usage);

    return {
      interpretation: parsed.interpretation || fallback.interpretation,
      strengths: parsed.strengths || fallback.strengths,
      weaknesses: parsed.weaknesses || fallback.weaknesses,
      industryComparison: parsed.industryComparison || fallback.industryComparison,
      improvementAreas: parsed.improvementAreas || fallback.improvementAreas,
      confidence: 0.8,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[analytics-ai] interpretBenchmark failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Generate a predictive narrative for projected KPI trajectories.
 *
 * Combines trend analysis with forward-looking risk assessment
 * to provide actionable planning guidance.
 */
export async function generatePredictiveNarrative(
  tenantId: string,
  predictions: {
    metricName: string;
    currentValue: number;
    predictedValue: number;
    targetValue: number;
    daysAhead: number;
    confidence: number;
    historicalTrend: 'improving' | 'declining' | 'stable';
  },
): Promise<PredictiveNarrativeResult> {
  const gap = predictions.targetValue - predictions.predictedValue;
  const onTrack = predictions.predictedValue >= predictions.targetValue;

  const fallback: PredictiveNarrativeResult = {
    narrative: `${predictions.metricName} is projected to reach ${predictions.predictedValue} in ${predictions.daysAhead} days. ` +
      (onTrack ? 'The metric is on track to meet the target.' : `A gap of ${Math.abs(gap).toFixed(1)} remains to reach the target of ${predictions.targetValue}.`),
    riskFactors: onTrack ? [] : [`Current trajectory falls short by ${Math.abs(gap).toFixed(1)} points`],
    opportunities: onTrack ? ['Maintain current pace to exceed targets'] : [],
    timelineAssessment: `${predictions.daysAhead}-day outlook based on ${predictions.historicalTrend} historical trend`,
    actionPlan: onTrack ? ['Continue monitoring'] : ['Identify improvement levers', 'Allocate additional resources'],
    confidence: predictions.confidence,
    modelUsed: 'fallback-rule-based',
    tokensUsed: { input: 0, output: 0 },
  };

  const claude = await getClaude();
  if (!claude) return fallback;

  try {
    const systemPrompt = `You are a GRC predictive analytics advisor. Generate forward-looking narratives based on projected metrics. Be practical and actionable. Output valid JSON only.`;

    const userPrompt = `Generate a predictive narrative:
Metric: ${predictions.metricName}
Current Value: ${predictions.currentValue}
Predicted Value (${predictions.daysAhead} days): ${predictions.predictedValue}
Target Value: ${predictions.targetValue}
Historical Trend: ${predictions.historicalTrend}
On Track: ${onTrack}
Confidence: ${(predictions.confidence * 100).toFixed(0)}%

Respond with JSON:
{
  "narrative": "2-3 sentence forward-looking assessment",
  "riskFactors": ["risk1", "risk2"],
  "opportunities": ["opp1", "opp2"],
  "timelineAssessment": "assessment",
  "actionPlan": ["step1", "step2"]
}`;

    const result = await claude.createChatCompletion(
      [{ role: 'user', content: userPrompt }],
      { system: systemPrompt, temperature: 0.2, maxTokens: 1024 },
    );

    if (!result) return fallback;

    const parsed = JSON.parse(result.content);
    await logAiInvocation(tenantId, 'generatePredictiveNarrative', result.usage);

    return {
      narrative: parsed.narrative || fallback.narrative,
      riskFactors: parsed.riskFactors || fallback.riskFactors,
      opportunities: parsed.opportunities || fallback.opportunities,
      timelineAssessment: parsed.timelineAssessment || fallback.timelineAssessment,
      actionPlan: parsed.actionPlan || fallback.actionPlan,
      confidence: predictions.confidence,
      modelUsed: claude.CLAUDE_MODEL,
      tokensUsed: result.usage,
    };
  } catch (err) {
    logger.error('[analytics-ai] generatePredictiveNarrative failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return fallback;
  }
}

/**
 * Run anomaly scanning across all metrics for a tenant.
 * Identifies statistical outliers and generates explanations.
 */
export async function scanForAnomalies(
  tenantId: string,
): Promise<Array<{
  metricCode: string;
  currentValue: number;
  expectedRange: { min: number; max: number };
  deviationPct: number;
  explanation: AnomalyExplanationResult;
}>> {
  const schema = tenantSchema(tenantId);
  const anomalies: Array<{
    metricCode: string; currentValue: number;
    expectedRange: { min: number; max: number }; deviationPct: number;
    explanation: AnomalyExplanationResult;
  }> = [];

  try {
    // Find metrics that deviate more than 2 standard deviations from their 30-day average
    const result = await safeQuery(
      `SELECT metric_code,
              AVG(value)::numeric AS avg_value,
              STDDEV(value)::numeric AS stddev_value,
              (SELECT value FROM "${schema}".analytics_kpi_snapshots s2
               WHERE s2.metric_code = s1.metric_code AND s2.deleted_at IS NULL
               ORDER BY computed_at DESC LIMIT 1) AS latest_value
       FROM "${schema}".analytics_kpi_snapshots s1
       WHERE deleted_at IS NULL AND computed_at > NOW() - INTERVAL '30 days'
       GROUP BY metric_code
       HAVING STDDEV(value) > 0`,
    );

    for (const row of result.rows) {
      const avg = parseFloat(row.avg_value) || 0;
      const stddev = parseFloat(row.stddev_value) || 0;
      const latest = parseFloat(row.latest_value) || 0;
      const deviation = Math.abs(latest - avg);

      if (deviation > stddev * 2) {
        const deviationPct = avg > 0 ? Math.round((deviation / avg) * 100) : 0;
        const expectedRange = { min: Math.round(avg - stddev * 2), max: Math.round(avg + stddev * 2) };

        const explanation = await explainAnomaly(tenantId, {
          metricCode: row.metric_code,
          currentValue: latest,
          expectedRange,
          historicalAverage: avg,
          recentChanges: [],
          relatedModuleEvents: [],
        });

        anomalies.push({
          metricCode: row.metric_code,
          currentValue: latest,
          expectedRange,
          deviationPct,
          explanation,
        });
      }
    }
  } catch (err) {
    logger.error('[analytics-ai] scanForAnomalies failed', {
      error: err instanceof Error ? err.message : String(err),
      tenantId,
    });
  }

  return anomalies;
}
