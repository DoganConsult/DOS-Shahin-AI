// @ts-nocheck
// ============================================
// Shahin — AI Analytics Engine
// Trend analysis, anomaly detection, and
// natural-language report summaries.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import type { ReportHubEntry } from "../../../reporting/services/report/report-hub.service";
import type { GenericRow } from '../../ports/platform.port';

// === Types ===

export type TrendDirection = "improving" | "declining" | "stable" | "insufficient_data";

export interface TrendResult {
  kpiName: string;
  direction: TrendDirection;
  slope: number;
  dataPoints: number;
  computedAt: string;
}

export interface AnomalyAlert {
  kpiName: string;
  currentValue: number;
  expectedMean: number;
  standardDeviation: number;
  deviationMagnitude: number;
  detectedAt: string;
}

export interface AIReportSummary {
  reportId: string;
  language: "en" | "ar";
  summaryText: string;
  generatedAt: string;
}

// === Pure Functions ===

/**
 * Classify a KPI trend based on its linear regression slope.
 * Returns 'improving' if slope > threshold, 'declining' if slope < -threshold,
 * 'stable' otherwise. Default threshold is 0.01.
 */
export function classifyTrend(slope: number, threshold: number = 0.01): TrendDirection {
  if (slope > threshold) return "improving";
  if (slope < -threshold) return "declining";
  return "stable";
}

/**
 * Compute rolling mean and population standard deviation for a set of values.
 * Returns { mean: 0, stdDev: 0 } for empty arrays.
 */
export function computeRollingStats(values: number[]): { mean: number; stdDev: number } {
  if (values.length === 0) return { mean: 0, stdDev: 0 };

  const n = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / n;
  const variance = values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
  const stdDev = Math.sqrt(variance);

  return { mean, stdDev };
}

/**
 * Determine if a value is anomalous relative to a rolling mean and standard deviation.
 * Returns true if |value - mean| > sigmaThreshold * stdDev.
 * If stdDev is 0, returns false (no deviation possible).
 * Default sigmaThreshold is 2.
 */
export function isAnomaly(
  value: number,
  mean: number,
  stdDev: number,
  sigmaThreshold: number = 2
): boolean {
  if (stdDev === 0) return false;
  return Math.abs(value - mean) > sigmaThreshold * stdDev;
}

/**
 * Serialize a TrendResult to JSON with consistent key ordering:
 * kpiName, direction, slope, dataPoints, computedAt
 */
export function serializeTrendResult(trend: TrendResult): string {
  return JSON.stringify({
    kpiName: trend.kpiName,
    direction: trend.direction,
    slope: trend.slope,
    dataPoints: trend.dataPoints,
    computedAt: trend.computedAt,
  });
}

/**
 * Deserialize a JSON string back into a TrendResult object.
 */
export function deserializeTrendResult(json: string): TrendResult {
  const obj = JSON.parse(json);
  return {
    kpiName: obj.kpiName,
    direction: obj.direction,
    slope: obj.slope,
    dataPoints: obj.dataPoints,
    computedAt: obj.computedAt,
  };
}

/**
 * Serialize an AnomalyAlert to JSON with consistent key ordering:
 * kpiName, currentValue, expectedMean, standardDeviation, deviationMagnitude, detectedAt
 */
export function serializeAnomalyAlert(alert: AnomalyAlert): string {
  return JSON.stringify({
    kpiName: alert.kpiName,
    currentValue: alert.currentValue,
    expectedMean: alert.expectedMean,
    standardDeviation: alert.standardDeviation,
    deviationMagnitude: alert.deviationMagnitude,
    detectedAt: alert.detectedAt,
  });
}

/**
 * Deserialize a JSON string back into an AnomalyAlert object.
 */
export function deserializeAnomalyAlert(json: string): AnomalyAlert {
  const obj = JSON.parse(json);
  return {
    kpiName: obj.kpiName,
    currentValue: obj.currentValue,
    expectedMean: obj.expectedMean,
    standardDeviation: obj.standardDeviation,
    deviationMagnitude: obj.deviationMagnitude,
    detectedAt: obj.detectedAt,
  };
}

// === KPI metric columns used for trend/anomaly analysis ===

const KPI_COLUMNS = [
  { column: "compliance_score", name: "Compliance Score" },
  { column: "risk_score", name: "Risk Score" },
  { column: "evidence_coverage", name: "Evidence Coverage" },
  { column: "remediation_closure_rate", name: "Remediation Closure Rate" },
] as const;

/**
 * Compute a simple linear regression slope for an array of numeric values.
 * x-axis is the index (0, 1, 2, ...), y-axis is the value.
 * Returns 0 if fewer than 2 data points.
 */
function linearRegressionSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (i - xMean) * (values[i] - yMean);
    denominator += (i - xMean) ** 2;
  }
  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Compute exponentially weighted moving average (EWMA).
 * Alpha controls the decay factor (higher = more weight on recent values).
 */
export function computeEWMA(values: number[], alpha: number = 0.3): number[] {
  if (values.length === 0) return [];
  const ewma: number[] = [values[0]];
  for (let i = 1; i < values.length; i++) {
    ewma.push(alpha * values[i] + (1 - alpha) * ewma[i - 1]);
  }
  return ewma;
}

/**
 * Forecast next N values using linear regression extrapolation.
 * Returns predicted values for the next `horizon` periods.
 */
export function forecastLinear(values: number[], horizon: number = 7): number[] {
  if (values.length < 2) return Array(horizon).fill(values[0] ?? 0);
  const n = values.length;
  const slope = linearRegressionSlope(values);
  const yMean = values.reduce((s, v) => s + v, 0) / n;
  const xMean = (n - 1) / 2;
  const intercept = yMean - slope * xMean;

  const forecasts: number[] = [];
  for (let i = 0; i < horizon; i++) {
    forecasts.push(Math.round((intercept + slope * (n + i)) * 100) / 100);
  }
  return forecasts;
}

/**
 * Compute KPI trends for a tenant by querying kpi_snapshots over the last N days.
 * For each KPI metric, computes linear regression slope, EWMA, and 7-day forecast.
 */
export async function computeTrends(
  tenantId: string,
  days: number = 30
): Promise<(TrendResult & { ewmaLatest: number; forecast7d: number[] })[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT snapshot_date, compliance_score, risk_score, evidence_coverage, remediation_closure_rate
     FROM "${schema}".kpi_snapshots
     WHERE snapshot_date >= CURRENT_DATE - $1::int
     ORDER BY snapshot_date ASC`,
    [days]
  );

  const rows = result.rows;
  if (rows.length < 2) {
    return KPI_COLUMNS.map((kpi) => ({
      kpiName: kpi.name,
      direction: "insufficient_data" as TrendDirection,
      slope: 0,
      dataPoints: rows.length,
      computedAt: new Date().toISOString(),
      ewmaLatest: rows.length === 1 ? parseFloat(rows[0][kpi.column]) || 0 : 0,
      forecast7d: [],
    }));
  }

  const now = new Date().toISOString();
  return KPI_COLUMNS.map((kpi) => {
    const values = rows
      .map((r: GenericRow) => parseFloat(r[kpi.column]))
      .filter((v: number) => !isNaN(v));
    const slope = linearRegressionSlope(values);
    const ewma = computeEWMA(values, 0.3);
    const forecast = forecastLinear(values, 7);

    return {
      kpiName: kpi.name,
      direction: values.length < 2 ? ("insufficient_data" as TrendDirection) : classifyTrend(slope),
      slope: Math.round(slope * 10000) / 10000,
      dataPoints: values.length,
      computedAt: now,
      ewmaLatest: ewma.length > 0 ? Math.round(ewma[ewma.length - 1] * 100) / 100 : 0,
      forecast7d: forecast,
    };
  });
}

/**
 * Detect anomalous KPI values for a tenant by comparing the latest snapshot
 * against rolling statistics computed over the last N snapshots.
 */
export async function detectAnomalies(
  tenantId: string,
  windowSize: number = 20
): Promise<AnomalyAlert[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT compliance_score, risk_score, evidence_coverage, remediation_closure_rate
     FROM "${schema}".kpi_snapshots
     ORDER BY snapshot_date DESC
     LIMIT $1`,
    [windowSize]
  );

  const rows = result.rows;
  if (rows.length < 3) return [];

  const latest = rows[0];
  const historical = rows.slice(1);
  const now = new Date().toISOString();
  const alerts: AnomalyAlert[] = [];

  for (const kpi of KPI_COLUMNS) {
    const currentValue = parseFloat(latest[kpi.column]);
    if (isNaN(currentValue)) continue;

    const historicalValues = historical
      .map((r: GenericRow) => parseFloat(r[kpi.column]))
      .filter((v: number) => !isNaN(v));

    if (historicalValues.length < 2) continue;

    const { mean, stdDev } = computeRollingStats(historicalValues);
    if (isAnomaly(currentValue, mean, stdDev)) {
      const deviation = stdDev > 0 ? Math.abs(currentValue - mean) / stdDev : 0;
      alerts.push({
        kpiName: kpi.name,
        currentValue: Math.round(currentValue * 100) / 100,
        expectedMean: Math.round(mean * 100) / 100,
        standardDeviation: Math.round(stdDev * 100) / 100,
        deviationMagnitude: Math.round(deviation * 100) / 100,
        detectedAt: now,
      });
    }
  }

  return alerts;
}

/**
 * Build a template-based natural-language summary from structured report data.
 * Pure function — no side effects, no API calls.
 *
 * Supports EN and AR templates. Includes report title, key metrics,
 * and any anomaly mentions.
 *
 * Requirement 12.2, 12.3, 12.4
 */
export function buildSummaryText(
  report: { title: string; module?: string; generatedAt?: string; data?: Record<string, unknown> },
  language: 'en' | 'ar',
  anomalies: AnomalyAlert[] = [],
): string {
  const metrics = report.data ?? {};
  const metricEntries = Object.entries(metrics).filter(
    ([, v]) => typeof v === 'number',
  );

  const anomalyCount = anomalies.length;

  if (language === 'ar') {
    let text = `تقرير: ${report.title}.`;
    if (report.module) text += ` الوحدة: ${report.module}.`;
    if (metricEntries.length > 0) {
      text += ' المقاييس الرئيسية: ' + metricEntries.map(([k, v]) => `${k}: ${v}`).join('، ') + '.';
    }
    if (anomalyCount > 0) {
      text += ` تم اكتشاف ${anomalyCount} حالة شاذة تتطلب المراجعة.`;
    }
    if (report.generatedAt) {
      text += ` تاريخ الإنشاء: ${new Date(report.generatedAt).toLocaleDateString('ar-SA')}.`;
    }
    return text;
  }

  // English
  let text = `Report: ${report.title}.`;
  if (report.module) text += ` Module: ${report.module}.`;
  if (metricEntries.length > 0) {
    text += ' Key metrics: ' + metricEntries.map(([k, v]) => `${k}: ${v}`).join(', ') + '.';
  }
  if (anomalyCount > 0) {
    text += ` ${anomalyCount} anomal${anomalyCount === 1 ? 'y' : 'ies'} detected requiring review.`;
  }
  if (report.generatedAt) {
    text += ` Generated: ${new Date(report.generatedAt).toLocaleDateString('en-US')}.`;
  }
  return text;
}

/**
 * Generate a natural-language report summary using Claude AI.
 * Falls back to template-based summary if Claude is unavailable.
 */
export async function generateReportSummary(
  report: ReportHubEntry & { data: Record<string, unknown> },
  language: "en" | "ar",
  tenantId: string,
): Promise<AIReportSummary> {
  try {
    const { gatewayComplete } = await import('../gateway/ai-gateway.service');

    const metricsJson = JSON.stringify(report.data || {}, null, 2);
    const langInstruction =
      language === "ar"
        ? "Respond ONLY in Arabic. Write a professional executive summary."
        : "Respond ONLY in English. Write a professional executive summary.";

    const summaryText = await gatewayComplete({
      tenantId,
      systemPrompt: `You are a GRC (Governance, Risk & Compliance) report analyst for a Saudi Arabian organization.
${langInstruction}
Keep the summary concise (3-5 sentences). Highlight key findings, risk areas, and compliance posture.
Do NOT include any markdown formatting or headers — plain text only.`,
      userMessage: `Generate an executive summary for this GRC report.

Report Title: ${report.title}
Report Type: ${report.module || "general"}
Generated At: ${report.generatedAt || new Date().toISOString()}

Metrics & Data:
${metricsJson}`,
      maxTokens: 512,
      temperature: 0.4,
    });

    return {
      reportId: report.reportId,
      language,
      summaryText: summaryText.trim(),
      generatedAt: new Date().toISOString(),
    };
  } catch {
    // Fallback: template-based summary if Claude is unavailable
    const metrics = report.data || {};
    const metricEntries = Object.entries(metrics).filter(
      ([, v]) => typeof v === "number"
    );
    const metricText =
      metricEntries.length > 0
        ? metricEntries.map(([k, v]) => `${k}: ${v}`).join(", ")
        : "";

    const summaryText =
      language === "ar"
        ? `تقرير: ${report.title}. ${metricText}`
        : `Report: ${report.title}. ${metricText}`;

    return {
      reportId: report.reportId,
      language,
      summaryText,
      generatedAt: new Date().toISOString(),
    };
  }
}
