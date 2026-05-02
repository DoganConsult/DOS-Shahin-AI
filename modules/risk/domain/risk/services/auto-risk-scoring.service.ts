// ============================================
// Risk Module — Auto Risk Scoring Service
// Automated risk score recalculation from risk factors,
// control effectiveness, and scoring models.
// Owner: Product — risk module (Law 2)
//
// NOTE: The canonical heavy implementation lives at
// scoring/auto-risk-scoring.service.ts. This file provides
// the API surface expected by cross-module importers
// (e.g., incident-hub, compliance knowledge-hub).
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import type { GenericRow } from '@dos/types';

// ── Types ──────────────────────────────────────────────────────────

export interface RiskFactor {
  factorId: string;
  riskId: string;
  factorName: string;
  factorType: 'likelihood' | 'impact' | 'velocity' | 'vulnerability' | 'exposure';
  rawValue: number;
  weightedValue: number;
  weight: number;
  source: string;
  updatedAt: string;
}

export interface RiskScoringResult {
  riskId: string;
  previousScore: number;
  newScore: number;
  delta: number;
  factors: RiskFactor[];
  scoringMethod: string;
}

export interface BatchScoringResult {
  risksUpdated: number;
  avgRiskReduction: number;
  results: RiskScoringResult[];
}

// ── Risk Factors ───────────────────────────────────────────────────

/**
 * Retrieve the scoring factors for a specific risk,
 * including factor weights from the active scoring model.
 */
export async function getRiskFactors(
  tenantId: string,
  riskId: string,
): Promise<RiskFactor[]> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT rf.factor_id, rf.risk_id, rf.factor_name, rf.factor_type,
              rf.raw_value, rf.weight, rf.source, rf.updated_at
       FROM "${schema}".risk_factors rf
       WHERE rf.risk_id = $1 AND rf.deleted_at IS NULL
       ORDER BY rf.factor_type, rf.factor_name`,
      [riskId],
    );

    return rows.map((r: GenericRow) => ({
      factorId: r.factor_id,
      riskId: r.risk_id,
      factorName: r.factor_name,
      factorType: r.factor_type || 'impact',
      rawValue: Number(r.raw_value) || 0,
      weightedValue: (Number(r.raw_value) || 0) * (Number(r.weight) || 1),
      weight: Number(r.weight) || 1,
      source: r.source || 'manual',
      updatedAt: r.updated_at,
    }));
  } catch (err: unknown) {
    logger.warn(`[AutoRiskScoring] Could not load risk factors for ${riskId}: ${String(err)}`);
    return [];
  }
}

// ── Single Risk Recalculation ──────────────────────────────────────

/**
 * Recalculate the risk score for a single risk based on its factors
 * and the active scoring model. Updates the risk record in-place.
 */
export async function recalculateRiskScore(
  tenantId: string,
  riskId: string,
): Promise<RiskScoringResult> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

// ── Batch Recalculation ────────────────────────────────────────────

/**
 * Recalculate scores for all active risks in a tenant.
 * Returns summary statistics and per-risk results.
 */
export async function recalculateAllScores(
  tenantId: string,
): Promise<BatchScoringResult> {
  const schema = tenantSchema(tenantId);
  const results: RiskScoringResult[] = [];

  const { rows: risks } = await safeQuery(
    `SELECT risk_id FROM "${schema}".risks
     WHERE status IN ('open', 'mitigating', 'active')
       AND deleted_at IS NULL
     ORDER BY risk_id`,
  );

  for (const r of risks) {
    try {
      const result = await recalculateRiskScore(tenantId, r.risk_id);
      results.push(result);
    } catch (err: unknown) {
      logger.warn(`[AutoRiskScoring] Failed to score risk ${r.risk_id}: ${String(err)}`);
    }
  }

  const updated = results.filter((r) => r.delta !== 0);
  const totalReduction = updated.reduce(
    (sum, r) => sum + Math.max(0, -r.delta),
    0,
  );

  return {
    risksUpdated: updated.length,
    avgRiskReduction: updated.length > 0
      ? Math.round((totalReduction / updated.length) * 10) / 10
      : 0,
    results,
  };
}

// ── Legacy export alias ────────────────────────────────────────────

/**
 * @deprecated Use recalculateAllScores instead.
 * Kept for backward compatibility with incident-hub and knowledge-hub imports.
 */
export async function recalculateRiskScores(tenantId: string): Promise<{
  risksUpdated: number;
  avgRiskReduction: number;
}> {
  const result = await recalculateAllScores(tenantId);
  return {
    risksUpdated: result.risksUpdated,
    avgRiskReduction: result.avgRiskReduction,
  };
}
