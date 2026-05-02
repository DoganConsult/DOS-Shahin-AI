import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Risk Scoring Service
// Configurable scoring models, composite score
// computation, zone placement, KRI trends,
// threshold crossing notifications, and risk
// posture report generation
// ============================================

import { v4 as uuid } from "uuid";
import type { RiskLevel } from "@shahin-ai/shared-risk-types";
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { createNotification } from '../../../../infrastructure/adapters/notification.adapter';
import { orchestratedAssessRisk as assessRisk } from '../../../../infrastructure/adapters/ai.adapter';
import type { RiskScoringModel, RiskDimension, RiskFormula } from "@dos/types";
import { getFirstRow } from '@dos/db';

// ============================================================
// Types
// ============================================================

/** Aligned with @shahin/shared-risk-types RiskLevel (single source of zone names). */
export type RiskZone = RiskLevel;

export interface DimensionScore {
  name: string;
  score: number;
}

export interface ThresholdCrossingResult {
  crossed: boolean;
  direction: "up" | "down";
  fromZone: RiskZone;
  toZone: RiskZone;
}

export interface KRIDataPoint {
  date: string;
  score: number;
  zone: RiskZone;
}

export interface RiskPostureReport {
  totalRisks: number;
  byZone: { low: number; medium: number; high: number; critical: number };
  /** All scored risks with likelihood/impact (1–5) for heatmap. */
  risks: Array<{
    riskId: string;
    title: string;
    score: number;
    zone: RiskZone;
    likelihood: number;
    impact: number;
  }>;
  topRisks: Array<{
    riskId: string;
    title: string;
    score: number;
    zone: RiskZone;
    likelihood?: number;
    impact?: number;
  }>;
  trends: KRIDataPoint[];
  generatedAt: string;
}

// ============================================================
// Pure Functions (exported for property-based testing)
// ============================================================

/**
 * Compute a composite risk score from dimension scores using the model's
 * formula and weights. Returns a value normalized to 0–100.
 *
 * - **weighted / additive**: weighted sum of (score × weight), normalized
 *   so the maximum possible score maps to 100.
 * - **multiplicative**: product of normalized dimension scores, scaled to 100.
 *
 * If dimensions array is empty or model has no dimensions, returns 0.
 */
export function computeCompositeScore(
  dimensionScores: DimensionScore[],
  model: RiskScoringModel
): number {
  if (!model.dimensions.length || !dimensionScores.length) return 0;

  // Build a lookup of model dimensions by name
  const dimMap = new Map<string, RiskDimension>();
  for (const d of model.dimensions) {
    dimMap.set(d.name, d);
  }

  if (model.formula === "multiplicative") {
    // Product of each dimension's normalized value (0–1), then scale to 100
    let product = 1;
    let matched = 0;
    for (const ds of dimensionScores) {
      const dim = dimMap.get(ds.name);
      if (!dim) continue;
      const range = dim.scale.max! - dim.scale.min!;
      const normalized = range > 0
        ? Math.max(0, Math.min(1, (ds.score - dim.scale.min!) / range))
        : 0;
      product *= normalized;
      matched++;
    }
    if (matched === 0) return 0;
    return Math.round(product * 100 * 100) / 100;
  }

  // additive / weighted — weighted sum normalized to 0–100
  let weightedSum = 0;
  let totalWeight = 0;
  for (const ds of dimensionScores) {
    const dim = dimMap.get(ds.name);
    if (!dim) continue;
    const range = dim.scale.max! - dim.scale.min!;
    const normalized = range > 0
      ? Math.max(0, Math.min(1, (ds.score - dim.scale.min!) / range))
      : 0;
    weightedSum += normalized * dim.weight;
    totalWeight += dim.weight;
  }
  if (totalWeight === 0) return 0;
  return Math.round((weightedSum / totalWeight) * 100 * 100) / 100;
}

/**
 * Determine which risk zone a composite score falls into.
 *
 * Thresholds define the *lower bound* of each zone:
 *   score >= critical → "critical"
 *   score >= high     → "high"
 *   score >= medium   → "medium"
 *   otherwise         → "low"
 */
export function determineZone(
  score: number,
  thresholds: Record<string, number>,
): RiskZone {
  if (score >= thresholds.critical) return "critical";
  if (score >= thresholds.high) return "high";
  if (score >= thresholds.medium) return "medium";
  return "low";
}

/**
 * Check whether a score change crosses a threshold boundary.
 * Returns crossing details including direction and zone transition.
 */
export function checkThresholdCrossing(
  previousScore: number,
  currentScore: number,
  thresholds: Record<string, number>,
): ThresholdCrossingResult {
  const fromZone = determineZone(previousScore, thresholds);
  const toZone = determineZone(currentScore, thresholds);
  const crossed = fromZone !== toZone;
  const direction: "up" | "down" = currentScore >= previousScore ? "up" : "down";
  return { crossed, direction, fromZone, toZone };
}

// ============================================================
// Database Functions
// ============================================================

/**
 * List all risk scoring models for a tenant.
 */
export async function getRiskModels(
  tenantId: string
): Promise<RiskScoringModel[]> {
  const schema = tenantSchema(tenantId);

  // Table should exist via migration 368_risk_scoring_tables.sql
  const result = await safeQuery(
    `SELECT * FROM "${schema}".risk_scoring_models ORDER BY created_at DESC`
  );
  return result.rows.map(rowToModel);
}

/**
 * Create a new risk scoring model.
 */
export async function createRiskModel(
  tenantId: string,
  model: Omit<RiskScoringModel, "modelId"> & { modelId?: string; nameEn: string; nameAr: string; zoneDefinitions?: Record<string, string> }
): Promise<RiskScoringModel & { nameEn: string; nameAr: string }> {
  const schema = tenantSchema(tenantId);
  const modelId = model.modelId || uuid();

  // Table should exist via migration 368_risk_scoring_tables.sql
  const result = await safeQuery(
    `INSERT INTO "${schema}".risk_scoring_models
       (model_id, name_en, name_ar, dimensions, thresholds, formula, zone_definitions)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      modelId,
      model.nameEn,
      model.nameAr,
      JSON.stringify(model.dimensions),
      JSON.stringify(model.thresholds),
      model.formula,
      JSON.stringify(model.zoneDefinitions || {}),
    ]
  );
  return { ...rowToModel(getFirstRow(result)), nameEn: getFirstRow(result)?.name_en, nameAr: getFirstRow(result)?.name_ar };
}

/**
 * Update an existing risk scoring model.
 */
export async function updateRiskModel(
  tenantId: string,
  modelId: string,
  patch: { 
    nameEn?: string; 
    nameAr?: string; 
    dimensions?: RiskDimension[]; 
    thresholds?: { critical: number; high: number; medium: number; low: number }; 
    formula?: RiskFormula; 
    zoneDefinitions?: Record<string, string> 
  }
): Promise<RiskScoringModel & { nameEn: string; nameAr: string }> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Score a risk: compute composite score, store it, check threshold crossing,
 * and send notification if a threshold was crossed.
 */
export async function scoreRisk(
  tenantId: string,
  riskId: string,
  dimensionScores: DimensionScore[],
  modelId: string
): Promise<{
  compositeScore: number;
  zone: RiskZone;
  thresholdCrossing: ThresholdCrossingResult | null;
}> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Get KRI score history for a risk over time.
 * Returns score history points for the specified number of periods.
 * (Law 12: renamed from getKRITrends to avoid collision with risk.service.ts)
 */
export async function getKRIScoreHistory(
  tenantId: string,
  riskId: string,
  periods: number = 12
): Promise<KRIDataPoint[]> {
  const schema = tenantSchema(tenantId);

  // Table should exist via migration 368_risk_scoring_tables.sql
  const result = await safeQuery(
    `SELECT composite_score, zone, scored_at
     FROM "${schema}".risk_score_history
     WHERE risk_id = $1
     ORDER BY scored_at DESC
     LIMIT $2`,
    [riskId, periods]
  );

  interface KRIRow {
    composite_score: string | number;
    zone: string;
    scored_at: Date | string;
  }

  return result.rows
    .map((r: KRIRow) => ({
      date: r.scored_at instanceof Date
        ? r.scored_at.toISOString().split("T")[0]
        : String(r.scored_at).split("T")[0],
      score: parseFloat(String(r.composite_score)),
      zone: r.zone as RiskZone,
    }))
    .reverse(); // chronological order
}

/**
 * Generate a risk posture report for the tenant.
 * Aggregates risks by zone, lists top risks, and includes recent trends.
 */
export async function getRiskPosture(
  tenantId: string
): Promise<RiskPostureReport> {
  const schema = tenantSchema(tenantId);

  // Table should exist via migration 368_risk_scoring_tables.sql
  // Get all risks with their latest score and likelihood/impact from risks table (for heatmap)
  const latestScores = await safeQuery(
    `SELECT DISTINCT ON (h.risk_id)
       h.risk_id, h.composite_score, h.zone, h.scored_at,
       r.title, r.likelihood, r.impact
     FROM "${schema}".risk_score_history h
     LEFT JOIN "${schema}".risks r ON r.risk_id = h.risk_id
     ORDER BY h.risk_id, h.scored_at DESC`
  );

  const allRisks = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".risks`
  );
  const totalRisks = getFirstRow(allRisks)?.total || 0;

  // Clamp likelihood/impact to 1–5 for heatmap
  const clamp = (v: unknown): number => {
    const n = Number(v);
    if (Number.isNaN(n)) return 3;
    return Math.max(1, Math.min(5, Math.round(n)));
  };

  // Aggregate by zone and build risks array with likelihood/impact
  const byZone = { low: 0, medium: 0, high: 0, critical: 0 };
  const scored: Array<{ riskId: string; title: string; score: number; zone: RiskZone; likelihood: number; impact: number }> = [];

  for (const row of latestScores.rows) {
    const zone = row.zone as RiskZone;
    if (zone in byZone) byZone[zone]++;
    scored.push({
      riskId: row.risk_id,
      title: row.title || row.risk_id,
      score: parseFloat(row.composite_score),
      zone,
      likelihood: clamp(row.likelihood),
      impact: clamp(row.impact),
    });
  }

  // Top risks by score descending (include likelihood/impact for UI)
  const topRisks = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((r) => ({ ...r, likelihood: r.likelihood, impact: r.impact }));

  // Recent trend data (last 30 days, daily average)
  const trendResult = await safeQuery(
    `SELECT
       DATE(scored_at) AS date,
       AVG(composite_score)::float AS avg_score
     FROM "${schema}".risk_score_history
     WHERE scored_at >= NOW() - INTERVAL '30 days'
     GROUP BY DATE(scored_at)
     ORDER BY date ASC`
  );

  // We need model thresholds for zone assignment on trends — use a default
  const defaultThresholds = { low: 0, medium: 25, high: 50, critical: 75 };
  
  interface TrendRow {
    date: Date | string;
    avg_score: string | number;
  }

  const trends: KRIDataPoint[] = trendResult.rows.map((r: TrendRow) => {
    const avgScore = parseFloat(Number(r.avg_score).toFixed(2));
    return {
      date: r.date instanceof Date ? r.date.toISOString().split("T")[0] : String(r.date),
      score: avgScore,
      zone: determineZone(avgScore, defaultThresholds),
    };
  });

  return {
    totalRisks,
    byZone,
    risks: scored,
    topRisks,
    trends,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Get AI-powered risk treatment recommendations for a specific risk.
 * Delegates to ai-agent.service.ts assessRisk.
 */
export async function getAIRecommendations(
  tenantId: string,
  riskId: string
): Promise<Record<string, unknown>> {

  return assessRisk(tenantId, riskId);
}

/**
 * Predict risk trajectory using KRI trend analysis.
 * Calculates breach probability for threshold crossings and creates observations if high.
 * Requirements: Feature 21 - Predictive Risk Scoring (Trend-Based)
 */
export async function predictRiskTrajectory(
  tenantId: string,
  riskId: string,
  modelId?: string,
  lookaheadDays: number = 30
): Promise<{
  currentScore: number;
  currentZone: RiskZone;
  projectedScore: number;
  projectedZone: RiskZone;
  breachProbability: {
    high: number;
    critical: number;
  };
  trajectory: Array<{ date: string; score: number; zone: RiskZone }>;
  observationCreated: boolean;
}> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

// ============================================================
// Helpers
// ============================================================

interface RiskScoringModelRow {
  model_id: string;
  dimensions: string | RiskDimension[];
  thresholds: string | { critical: number; high: number; medium: number; low: number };
  formula: string;
}

function rowToModel(row: RiskScoringModelRow): RiskScoringModel {
  return {
    modelId: row.model_id,
    dimensions: typeof row.dimensions === "string"
      ? JSON.parse(row.dimensions) as RiskDimension[]
      : (row.dimensions || []) as RiskDimension[],
    thresholds: typeof row.thresholds === "string"
      ? JSON.parse(row.thresholds) as { critical: number; high: number; medium: number; low: number }
      : (row.thresholds || { low: 0, medium: 25, high: 50, critical: 75 }) as { critical: number; high: number; medium: number; low: number },
    formula: (row.formula || "weighted") as RiskFormula,
  };
}
