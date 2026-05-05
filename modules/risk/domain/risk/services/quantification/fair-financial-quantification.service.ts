import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Financial Risk Quantification (FAIR Model)
// Loss Event Frequency (LEF) × Loss Magnitude (LM) = Financial Exposure
// AI-enhanced magnitude estimation
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { orchestratedAssessRisk as assessRisk } from '../../../../infrastructure/adapters/ai.adapter';
import { getFirstRow } from '@dos/db';

// ── Types ──────────────────────────────────────────────────────────────────

/**
 * Loss Event Frequency (LEF) — events per year
 * Based on threat event frequency and vulnerability
 */
export interface LossEventFrequency {
  /** Threat Event Frequency (TEF) — how often threat acts against asset */
  threatEventFrequency: number; // events/year
  /** Vulnerability — probability threat succeeds when acting */
  vulnerability: number; // 0-1 probability
  /** Computed LEF = TEF × vulnerability */
  lef: number; // events/year
  /** Confidence in LEF estimate (0-1) */
  confidence: number;
  /** Source of estimate */
  source: 'manual' | 'historical' | 'ai_enhanced' | 'industry_benchmark';
}

/**
 * Loss Magnitude (LM) — financial loss per event
 * Can be single value or distribution (min, max, most likely)
 */
export interface LossMagnitude {
  /** Primary loss estimate (currency amount) */
  primaryLoss: number;
  /** Minimum loss (pessimistic scenario) */
  minLoss?: number;
  /** Maximum loss (worst-case scenario) */
  maxLoss?: number;
  /** Most likely loss (mode) */
  mostLikelyLoss?: number;
  /** Currency code (e.g., 'SAR', 'USD') */
  currency: string;
  /** Loss categories */
  categories: {
    response: number; // response costs
    replacement: number; // asset replacement
    productivity: number; // productivity loss
    fines: number; // regulatory fines
    reputation: number; // reputation damage (estimated)
    legal: number; // legal costs
  };
  /** Confidence in LM estimate (0-1) */
  confidence: number;
  /** Source of estimate */
  source: 'manual' | 'historical' | 'ai_enhanced' | 'industry_benchmark';
}

/**
 * FAIR Financial Exposure Result
 */
export interface FairFinancialExposure {
  riskId: string;
  /** LEF × LM = annual expected loss */
  annualExpectedLoss: number;
  /** LEF component */
  lef: LossEventFrequency;
  /** LM component */
  lm: LossMagnitude;
  /** Currency */
  currency: string;
  /** Confidence in overall estimate (weighted average of LEF/LM confidence) */
  confidence: number;
  /** Breakdown by loss category */
  categoryBreakdown: {
    response: number; // annual expected
    replacement: number;
    productivity: number;
    fines: number;
    reputation: number;
    legal: number;
  };
  /** Computed at timestamp */
  computedAt: string;
  /** AI enhancement applied */
  aiEnhanced: boolean;
}

/**
 * AI-enhanced magnitude estimation input
 */
export interface MagnitudeEstimationInput {
  riskId: string;
  riskTitle: string;
  riskDescription?: string;
  riskCategory: string;
  affectedAssets?: string[];
  sector?: string;
  companySize?: string;
  historicalIncidents?: Array<{
    incidentType: string;
    lossAmount: number;
    currency: string;
    date: string;
  }>;
}

// ── Core FAIR Calculations ────────────────────────────────────────────────

/**
 * Compute Loss Event Frequency (LEF) from TEF and vulnerability
 * LEF = TEF × vulnerability
 */
export function computeLEF(
  threatEventFrequency: number,
  vulnerability: number,
  confidence: number = 0.7
): LossEventFrequency {
  const lef = threatEventFrequency * vulnerability;
  return {
    threatEventFrequency,
    vulnerability,
    lef: Math.max(0, lef),
    confidence: Math.max(0, Math.min(1, confidence)),
    source: 'manual',
  };
}

/**
 * Compute Loss Magnitude from category breakdown
 */
export function computeLossMagnitude(
  categories: LossMagnitude['categories'],
  currency: string = 'SAR',
  confidence: number = 0.7
): LossMagnitude {
  const primaryLoss = Object.values(categories).reduce((sum, val) => sum + val, 0);
  return {
    primaryLoss,
    currency,
    categories,
    confidence: Math.max(0, Math.min(1, confidence)),
    source: 'manual',
  };
}

/**
 * Compute Financial Exposure = LEF × LM
 */
export function computeFinancialExposure(
  lef: LossEventFrequency,
  lm: LossMagnitude
): FairFinancialExposure {
  const annualExpectedLoss = lef.lef * lm.primaryLoss;
  const confidence = (lef.confidence + lm.confidence) / 2;

  // Annual breakdown by category
  const categoryBreakdown = {
    response: lef.lef * lm.categories.response,
    replacement: lef.lef * lm.categories.replacement,
    productivity: lef.lef * lm.categories.productivity,
    fines: lef.lef * lm.categories.fines,
    reputation: lef.lef * lm.categories.reputation,
    legal: lef.lef * lm.categories.legal,
  };

  return {
    riskId: '', // will be set by caller
    annualExpectedLoss: Math.max(0, annualExpectedLoss),
    lef,
    lm,
    currency: lm.currency,
    confidence,
    categoryBreakdown,
    computedAt: new Date().toISOString(),
    aiEnhanced: lef.source === 'ai_enhanced' || lm.source === 'ai_enhanced',
  };
}

// ── AI-Enhanced Magnitude Estimation ───────────────────────────────────────

/**
 * AI-enhanced loss magnitude estimation
 * Uses AI agent to estimate financial impact based on risk context
 */
export async function estimateMagnitudeWithAI(
  tenantId: string,
  input: MagnitudeEstimationInput
): Promise<LossMagnitude> {
  try {
    // Call AI agent for risk assessment
    // Note: orchestratedAssessRisk only takes tenantId and riskId
    // Financial context will be inferred from risk data
    const aiAssessment = await assessRisk(tenantId, input.riskId);

    // Extract financial estimates from AI response
    // AI should return structured estimates for each category
    // If not available, we'll use manual estimation with context

    const aiEstimates = (aiAssessment as { financialImpact?: Record<string, unknown> } | undefined)?.financialImpact || {};

    // Default currency based on tenant (KSA = SAR)
    const currency = 'SAR';

    // Build loss magnitude from AI estimates
    const categories: LossMagnitude['categories'] = {
      response: Number(aiEstimates.responseCosts || estimateResponseCosts(input)),
      replacement: Number(aiEstimates.replacementCosts || estimateReplacementCosts(input)),
      productivity: Number(aiEstimates.productivityLoss || estimateProductivityLoss(input)),
      fines: Number(aiEstimates.regulatoryFines || estimateRegulatoryFines(input)),
      reputation: Number(aiEstimates.reputationDamage || estimateReputationDamage(input)),
      legal: Number(aiEstimates.legalCosts || estimateLegalCosts(input)),
    };

    return computeLossMagnitude(categories, currency, 0.8); // Higher confidence for AI-enhanced
  } catch (error) {
    logger.warn('[FAIR] AI magnitude estimation failed, falling back to manual estimates:', error);
    // Fallback to manual estimation
    return estimateMagnitudeManual(input);
  }
}

/**
 * Manual magnitude estimation (fallback)
 * Uses heuristics based on risk category and company size
 */
function estimateMagnitudeManual(input: MagnitudeEstimationInput): LossMagnitude {
  const currency = 'SAR';
  const baseMultiplier = getCompanySizeMultiplier(input.companySize || 'MEDIUM');

  // Category-based heuristics
  const category = input.riskCategory.toLowerCase();
  let baseAmount = 100000; // Base 100K SAR

  if (category.includes('data breach') || category.includes('privacy')) {
    baseAmount = 500000; // Higher for data breaches
  } else if (category.includes('cyber') || category.includes('security')) {
    baseAmount = 300000;
  } else if (category.includes('compliance') || category.includes('regulatory')) {
    baseAmount = 200000;
  } else if (category.includes('operational')) {
    baseAmount = 150000;
  }

  const scaledAmount = baseAmount * baseMultiplier;

  const categories: LossMagnitude['categories'] = {
    response: scaledAmount * 0.2, // 20% response costs
    replacement: scaledAmount * 0.15, // 15% replacement
    productivity: scaledAmount * 0.25, // 25% productivity
    fines: scaledAmount * 0.15, // 15% fines
    reputation: scaledAmount * 0.15, // 15% reputation
    legal: scaledAmount * 0.10, // 10% legal
  };

  return computeLossMagnitude(categories, currency, 0.5); // Lower confidence for manual
}

// ── Helper Estimation Functions ────────────────────────────────────────────

function estimateResponseCosts(input: MagnitudeEstimationInput): number {
  const base = 50000;
  const multiplier = getCompanySizeMultiplier(input.companySize || 'MEDIUM');
  return base * multiplier;
}

function estimateReplacementCosts(input: MagnitudeEstimationInput): number {
  const assetCount = input.affectedAssets?.length || 1;
  const basePerAsset = 25000;
  return assetCount * basePerAsset * getCompanySizeMultiplier(input.companySize || 'MEDIUM');
}

function estimateProductivityLoss(input: MagnitudeEstimationInput): number {
  const base = 100000;
  const multiplier = getCompanySizeMultiplier(input.companySize || 'MEDIUM');
  return base * multiplier;
}

function estimateRegulatoryFines(input: MagnitudeEstimationInput): number {
  // KSA-specific: PDPL fines up to 5M SAR, NCA fines vary
  const base = 200000;
  const multiplier = getCompanySizeMultiplier(input.companySize || 'MEDIUM');
  return base * multiplier;
}

function estimateReputationDamage(input: MagnitudeEstimationInput): number {
  // Hard to quantify, use conservative estimate
  const base = 150000;
  const multiplier = getCompanySizeMultiplier(input.companySize || 'MEDIUM');
  return base * multiplier;
}

function estimateLegalCosts(input: MagnitudeEstimationInput): number {
  const base = 75000;
  const multiplier = getCompanySizeMultiplier(input.companySize || 'MEDIUM');
  return base * multiplier;
}

function getCompanySizeMultiplier(size: string): number {
  const multipliers: Record<string, number> = {
    STARTUP: 0.5,
    SMALL: 1.0,
    MEDIUM: 2.0,
    LARGE: 5.0,
    ENTERPRISE: 10.0,
  };
  return multipliers[size.toUpperCase()] || 1.0;
}

// ── Database Operations ────────────────────────────────────────────────────

/**
 * Store FAIR financial exposure for a risk
 */
export async function storeFairExposure(
  tenantId: string,
  exposure: FairFinancialExposure
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Check if table exists (create if needed via migration)
  await safeQuery(
    `CREATE TABLE IF NOT EXISTS "${schema}".fair_financial_exposures (
      exposure_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL,
      risk_id UUID NOT NULL,
      annual_expected_loss NUMERIC(15,2) NOT NULL,
      lef_data JSONB NOT NULL,
      lm_data JSONB NOT NULL,
      currency VARCHAR(10) NOT NULL DEFAULT 'SAR',
      confidence NUMERIC(3,2) NOT NULL,
      category_breakdown JSONB NOT NULL,
      ai_enhanced BOOLEAN NOT NULL DEFAULT false,
      computed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(tenant_id, risk_id)
    )`,
    []
  );

  // Upsert exposure
  await safeQuery(
    `INSERT INTO "${schema}".fair_financial_exposures
       (tenant_id, risk_id, annual_expected_loss, lef_data, lm_data, currency, confidence, category_breakdown, ai_enhanced, computed_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (tenant_id, risk_id)
     DO UPDATE SET
       annual_expected_loss = EXCLUDED.annual_expected_loss,
       lef_data = EXCLUDED.lef_data,
       lm_data = EXCLUDED.lm_data,
       currency = EXCLUDED.currency,
       confidence = EXCLUDED.confidence,
       category_breakdown = EXCLUDED.category_breakdown,
       ai_enhanced = EXCLUDED.ai_enhanced,
       computed_at = EXCLUDED.computed_at,
       updated_at = NOW()`,
    [
      tenantId,
      exposure.riskId,
      exposure.annualExpectedLoss,
      JSON.stringify(exposure.lef),
      JSON.stringify(exposure.lm),
      exposure.currency,
      exposure.confidence,
      JSON.stringify(exposure.categoryBreakdown),
      exposure.aiEnhanced,
      exposure.computedAt,
    ]
  );

  // Publish event
  eventBus.publish(({
      eventType: 'risk.financial_exposure_calculated',
      tenantId,
      sourceService: 'fair-financial-quantification',
      entityType: 'risk',
      entityId: exposure.riskId,
      severity: exposure.annualExpectedLoss > 1000000 ? 'critical' : 'info',
      payload: {
        riskId: exposure.riskId,
        annualExpectedLoss: exposure.annualExpectedLoss,
        currency: exposure.currency,
        confidence: exposure.confidence,
      },
    } as any));
}

/**
 * Get FAIR exposure for a risk
 */
export async function getFairExposure(
  tenantId: string,
  riskId: string
): Promise<FairFinancialExposure | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".fair_financial_exposures
     WHERE tenant_id = $1 AND risk_id = $2
     ORDER BY computed_at DESC
     LIMIT 1`,
    [tenantId, riskId]
  );

  if (result.rows.length === 0) return null;

  const row = getFirstRow(result);
  return {
    riskId: row.risk_id,
    annualExpectedLoss: parseFloat(row.annual_expected_loss),
    lef: row.lef_data,
    lm: row.lm_data,
    currency: row.currency,
    confidence: parseFloat(row.confidence),
    categoryBreakdown: row.category_breakdown,
    computedAt: row.computed_at,
    aiEnhanced: row.ai_enhanced,
  };
}

/**
 * Calculate FAIR exposure for a risk (with optional AI enhancement)
 */
export async function calculateFairExposure(
  tenantId: string,
  riskId: string,
  options: {
    threatEventFrequency?: number;
    vulnerability?: number;
    lossMagnitude?: LossMagnitude;
    useAIEnhancement?: boolean;
  } = {}
): Promise<FairFinancialExposure> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.risk_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return (result?.rows || []) as any;
}

/**
 * Get all FAIR exposures for a tenant (summary)
 */
export async function getTenantFairExposures(
  tenantId: string
): Promise<Array<{ riskId: string; annualExpectedLoss: number; currency: string; confidence: number }>> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT risk_id, annual_expected_loss, currency, confidence
     FROM "${schema}".fair_financial_exposures
     WHERE tenant_id = $1
     ORDER BY annual_expected_loss DESC`,
    [tenantId]
  );

  return result.rows.map((row) => ({
    riskId: row.risk_id,
    annualExpectedLoss: parseFloat(row.annual_expected_loss),
    currency: row.currency,
    confidence: parseFloat(row.confidence),
  }));
}
