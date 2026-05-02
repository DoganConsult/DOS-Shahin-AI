/**
 * Risk Scoring Service - Spec Compliant Implementation
 * Canonical service for risk scoring and assessment
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { SYSTEM_JOB_ACTOR as _SYSTEM_JOB_ACTOR } from '../ports/platform.port';
import { v4 as uuid } from 'uuid';

export interface RiskScoreFactors {
  likelihood: number; // 1-5 scale
  impact: number; // 1-5 scale
  velocity: number; // How quickly risk can materialize
  vulnerability: number; // System/organizational vulnerability
  controlEffectiveness: number; // 0-1 scale
  historicalData: number; // Historical occurrence data
  externalFactors: number; // Market, regulatory, environmental factors
}

export interface RiskScoreResult {
  riskId: string;
  tenantId: string;
  inherentScore: number;
  residualScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  scoreFactors: RiskScoreFactors;
  scoringMethod: 'qualitative' | 'quantitative' | 'hybrid';
  scoredBy: string;
  scoredAt: string;
  confidence: number; // 0-1 scale
  recommendations: string[];
  metadata?: Record<string, unknown>;
}

export interface RiskScoringRequest {
  riskId: string;
  tenantId: string;
  factors: RiskScoreFactors;
  scoringMethod: RiskScoreResult['scoringMethod'];
  scoredBy: string;
  metadata?: Record<string, unknown>;
}

export interface RiskScoringModel {
  modelId: string;
  name: string;
  description: string;
  tenantId: string;
  factors: Array<{
    name: string;
    weight: number;
    min: number;
    max: number;
    description: string;
  }>;
  thresholds: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * Calculate risk score using specified factors and method
 * Implements the canonical RiskScoringService from spec §3.1
 */
export async function calculateRiskScore(
  request: RiskScoringRequest
): Promise<RiskScoreResult> {
  const schema = tenantSchema(request.tenantId);

  try {
    // Get scoring model (use default if none specified)
    const model = await getActiveScoringModel(request.tenantId);
    
    // Calculate inherent score
    const inherentScore = calculateScore(
      request.factors,
      model.factors,
      request.scoringMethod
    );

    // Calculate residual score (considering control effectiveness)
    const residualFactors = {
      ...request.factors,
      likelihood: Math.max(1, request.factors.likelihood * (1 - request.factors.controlEffectiveness)),
      impact: Math.max(1, request.factors.impact * (1 - request.factors.controlEffectiveness))
    };

    const residualScore = calculateScore(
      residualFactors,
      model.factors,
      request.scoringMethod
    );

    // Determine risk level
    const riskLevel = determineRiskLevel(residualScore, model.thresholds);

    // Generate recommendations
    const recommendations = generateRecommendations(
      request.factors,
      inherentScore,
      residualScore,
      riskLevel
    );

    // Calculate confidence based on data completeness
    const confidence = calculateConfidence(request.factors);

    // Save scoring result
    const scoringResult: RiskScoreResult = {
      riskId: request.riskId,
      tenantId: request.tenantId,
      inherentScore,
      residualScore,
      riskLevel,
      scoreFactors: request.factors,
      scoringMethod: request.scoringMethod,
      scoredBy: request.scoredBy,
      scoredAt: new Date().toISOString(),
      confidence,
      recommendations,
      metadata: request.metadata
    };

    // Update risk register with new scores
    await safeQuery(
      `UPDATE "${schema}".risk_register
       SET inherent_score = $1, residual_score = $2, risk_level = $3,
           likelihood = $4, impact = $5, control_effectiveness = $6,
           updated_at = NOW()
       WHERE risk_id = $7 AND tenant_id = $8`,
      [
        inherentScore,
        residualScore,
        riskLevel,
        request.factors.likelihood,
        request.factors.impact,
        request.factors.controlEffectiveness,
        request.riskId,
        request.tenantId
      ]
    );

    // Log scoring history
    await safeQuery(
      `INSERT INTO "${schema}".risk_scoring_history
         (scoring_id, risk_id, tenant_id, inherent_score, residual_score, risk_level,
          scoring_factors, scoring_method, scored_by, confidence, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
      [
        uuid(),
        request.riskId,
        request.tenantId,
        inherentScore,
        residualScore,
        riskLevel,
        JSON.stringify(request.factors),
        request.scoringMethod,
        request.scoredBy,
        confidence
      ]
    );

    logger.info('[RiskScoringService] Risk score calculated', {
      tenantId: request.tenantId,
      riskId: request.riskId,
      inherentScore,
      residualScore,
      riskLevel,
      scoredBy: request.scoredBy
    });

    return scoringResult;

  } catch (error) {
    logger.error('[RiskScoringService] Failed to calculate risk score', {
      tenantId: request.tenantId,
      riskId: request.riskId,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Batch calculate scores for multiple risks
 */
export async function batchCalculateRiskScores(
  tenantId: string,
  requests: RiskScoringRequest[]
): Promise<RiskScoreResult[]> {
  const results: RiskScoreResult[] = [];

  for (const request of requests) {
    try {
      const result = await calculateRiskScore(request);
      results.push(result);
    } catch (error) {
      logger.error('[RiskScoringService] Failed to calculate batch risk score', {
        tenantId,
        riskId: request.riskId,
        error: (error as Error).message
      });
      // Continue with other risks even if one fails
    }
  }

  return results;
}

/**
 * Get scoring history for a risk
 */
export async function getScoringHistory(
  tenantId: string,
  riskId: string,
  limit: number = 10
): Promise<RiskScoreResult[]> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT 
         scoring_id, risk_id, tenant_id, inherent_score, residual_score, risk_level,
         scoring_factors, scoring_method, scored_by, confidence, created_at
       FROM "${schema}".risk_scoring_history
       WHERE risk_id = $1 AND tenant_id = $2
       ORDER BY created_at DESC
       LIMIT $3`,
      [riskId, tenantId, limit]
    );

    return rows.map(row => ({
      riskId: row.risk_id,
      tenantId: row.tenant_id,
      inherentScore: row.inherent_score,
      residualScore: row.residual_score,
      riskLevel: row.risk_level,
      scoreFactors: JSON.parse(row.scoring_factors),
      scoringMethod: row.scoring_method,
      scoredBy: row.scored_by,
      scoredAt: row.created_at,
      confidence: row.confidence,
      recommendations: [] as string[] // Would need to join with recommendations table
    }));

  } catch (error) {
    logger.error('[RiskScoringService] Failed to get scoring history', {
      tenantId,
      riskId,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Create or update scoring model
 */
export async function createScoringModel(
  tenantId: string,
  model: Omit<RiskScoringModel, 'modelId' | 'tenantId' | 'createdAt' | 'updatedAt'>
): Promise<RiskScoringModel> {
  const schema = tenantSchema(tenantId);
  const modelId = uuid();

  try {
    const { rows } = await safeQuery(
      `INSERT INTO "${schema}".risk_scoring_models
         (model_id, name, description, tenant_id, factors, thresholds, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING *`,
      [
        modelId,
        model.name,
        model.description,
        tenantId,
        JSON.stringify(model.factors),
        JSON.stringify(model.thresholds),
        model.isActive
      ]
    );

    logger.info('[RiskScoringService] Scoring model created', {
      tenantId,
      modelId,
      name: model.name
    });

    return mapRowToScoringModel(rows[0]);

  } catch (error) {
    logger.error('[RiskScoringService] Failed to create scoring model', {
      tenantId,
      error: (error as Error).message
    });

    throw error;
  }
}

/**
 * Get active scoring model
 */
export async function getActiveScoringModel(tenantId: string): Promise<RiskScoringModel> {
  const schema = tenantSchema(tenantId);

  try {
    const { rows } = await safeQuery(
      `SELECT * FROM "${schema}".risk_scoring_models
       WHERE tenant_id = $1 AND is_active = true
       ORDER BY created_at DESC
       LIMIT 1`,
      [tenantId]
    );

    if (!rows.length) {
      // Return default model if none exists
      return getDefaultScoringModel(tenantId);
    }

    return mapRowToScoringModel(rows[0]);

  } catch (error) {
    logger.error('[RiskScoringService] Failed to get active scoring model', {
      tenantId,
      error: (error as Error).message
    });

    // Return default model on error
    return getDefaultScoringModel(tenantId);
  }
}

/**
 * Get scoring analytics
 */
export async function getScoringAnalytics(
  tenantId: string,
  startDate?: string,
  endDate?: string
): Promise<{
  totalScores: number;
  averageInherentScore: number;
  averageResidualScore: number;
  scoreDistribution: Record<string, number>;
  scoringTrends: Array<{
    date: string;
    averageInherentScore: number;
    averageResidualScore: number;
  }>;
  topScoringFactors: Array<{
    factor: string;
    averageValue: number;
    impact: number;
  }>;
}> {
  const schema = tenantSchema(tenantId);

  try {
    let dateFilter = '';
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (startDate && endDate) {
      dateFilter = ` AND created_at BETWEEN $${paramIndex++} AND $${paramIndex++}`;
      params.push(startDate, endDate);
    }

    // Get basic statistics
    const { rows: statRows } = await safeQuery(
      `SELECT 
         COUNT(*) as total_scores,
         AVG(inherent_score) as avg_inherent_score,
         AVG(residual_score) as avg_residual_score
       FROM "${schema}".risk_scoring_history
       WHERE tenant_id = $1${dateFilter}`,
      params
    );

    // Get score distribution
    const { rows: distRows } = await safeQuery(
      `SELECT risk_level, COUNT(*) as count
       FROM "${schema}".risk_scoring_history
       WHERE tenant_id = $1${dateFilter}
       GROUP BY risk_level`,
      params
    );

    // Get scoring trends
    const { rows: trendRows } = await safeQuery(
      `SELECT 
         DATE(created_at) as date,
         AVG(inherent_score) as avg_inherent_score,
         AVG(residual_score) as avg_residual_score
       FROM "${schema}".risk_scoring_history
       WHERE tenant_id = $1${dateFilter}
       GROUP BY DATE(created_at)
       ORDER BY date`,
      params
    );

    // Get top scoring factors
    const { rows: factorRows } = await safeQuery(
      `SELECT 
         jsonb_array_elements(scoring_factors)->>'name' as factor,
         AVG((jsonb_array_elements(scoring_factors)->>'value')::float) as avg_value,
         COUNT(*) as impact
       FROM "${schema}".risk_scoring_history
       WHERE tenant_id = $1${dateFilter}
       GROUP BY factor
       ORDER BY impact DESC
       LIMIT 10`,
      params
    );

    const stats = statRows[0];

    return {
      totalScores: parseInt(stats.total_scores),
      averageInherentScore: parseFloat(stats.avg_inherent_score) || 0,
      averageResidualScore: parseFloat(stats.avg_residual_score) || 0,
      scoreDistribution: distRows.reduce((acc, row) => {
        acc[row.risk_level] = parseInt(row.count);
        return acc;
      }, {} as Record<string, number>),
      scoringTrends: trendRows.map(row => ({
        date: row.date,
        averageInherentScore: parseFloat(row.avg_inherent_score),
        averageResidualScore: parseFloat(row.avg_residual_score)
      })),
      topScoringFactors: factorRows.map(row => ({
        factor: row.factor,
        averageValue: parseFloat(row.avg_value),
        impact: parseInt(row.impact)
      }))
    };

  } catch (error) {
    logger.error('[RiskScoringService] Failed to get scoring analytics', {
      tenantId,
      error: (error as Error).message
    });

    throw error;
  }
}

// Helper functions

function calculateScore(
  factors: RiskScoreFactors,
  modelFactors: RiskScoringModel['factors'],
  method: 'qualitative' | 'quantitative' | 'hybrid'
): number {
  if (method === 'qualitative') {
    // Simple weighted average for qualitative scoring
    const weights = {
      likelihood: 0.3,
      impact: 0.4,
      velocity: 0.1,
      vulnerability: 0.1,
      historicalData: 0.05,
      externalFactors: 0.05
    };

    return Object.entries(weights).reduce((score, [key, weight]) => {
      return score + (factors[key as keyof RiskScoreFactors] * weight);
    }, 0) * 20; // Scale to 0-100
  }

  if (method === 'quantitative') {
    // More complex quantitative calculation
    const baseScore = (factors.likelihood * factors.impact) * 4; // 1-25 scale
    const velocityMultiplier = 1 + (factors.velocity - 1) * 0.2; // 0.8-1.6
    const vulnerabilityMultiplier = 1 + (factors.vulnerability - 1) * 0.15; // 0.85-1.6
    const historicalMultiplier = 1 + (factors.historicalData - 1) * 0.1; // 0.9-1.4
    const externalMultiplier = 1 + (factors.externalFactors - 1) * 0.05; // 0.95-1.2

    return Math.min(100, baseScore * velocityMultiplier * vulnerabilityMultiplier * historicalMultiplier * externalMultiplier);
  }

  // Hybrid method - combine both approaches
  const qualitativeScore = calculateScore(factors, modelFactors, 'qualitative');
  const quantitativeScore = calculateScore(factors, modelFactors, 'quantitative');
  
  return (qualitativeScore + quantitativeScore) / 2;
}

function determineRiskLevel(
  score: number,
  thresholds: RiskScoringModel['thresholds']
): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= thresholds.critical) return 'critical';
  if (score >= thresholds.high) return 'high';
  if (score >= thresholds.medium) return 'medium';
  return 'low';
}

function generateRecommendations(
  factors: RiskScoreFactors,
  inherentScore: number,
  residualScore: number,
  riskLevel: string
): string[] {
  const recommendations: string[] = [];

  if (factors.likelihood >= 4) {
    recommendations.push('Consider implementing preventive measures to reduce likelihood');
  }

  if (factors.impact >= 4) {
    recommendations.push('Develop contingency plans to mitigate potential impact');
  }

  if (factors.velocity >= 4) {
    recommendations.push('Implement rapid response protocols due to high velocity');
  }

  if (factors.vulnerability >= 4) {
    recommendations.push('Strengthen controls to address vulnerability');
  }

  if (factors.controlEffectiveness <= 0.3) {
    recommendations.push('Improve control effectiveness to reduce residual risk');
  }

  if (residualScore > inherentScore * 0.8) {
    recommendations.push('Controls are not effectively reducing risk - review and enhance');
  }

  if (riskLevel === 'critical') {
    recommendations.push('Immediate management attention required for critical risk');
  }

  return recommendations;
}

function calculateConfidence(factors: RiskScoreFactors): number {
  // Calculate confidence based on data completeness and quality
  let confidence = 0.5; // Base confidence

  // Higher confidence with more complete data
  if (factors.likelihood > 0) confidence += 0.1;
  if (factors.impact > 0) confidence += 0.1;
  if (factors.velocity > 0) confidence += 0.1;
  if (factors.vulnerability > 0) confidence += 0.1;
  if (factors.historicalData > 0) confidence += 0.1;

  return Math.min(1, confidence);
}

function mapRowToScoringModel(row: any): RiskScoringModel {
  return {
    modelId: row.model_id,
    name: row.name,
    description: row.description,
    tenantId: row.tenant_id,
    factors: JSON.parse(row.factors),
    thresholds: JSON.parse(row.thresholds),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function getDefaultScoringModel(tenantId: string): RiskScoringModel {
  return {
    modelId: 'default',
    name: 'Default Risk Scoring Model',
    description: 'Default model for risk scoring',
    tenantId,
    factors: [
      { name: 'likelihood', weight: 0.3, min: 1, max: 5, description: 'Likelihood of occurrence' },
      { name: 'impact', weight: 0.4, min: 1, max: 5, description: 'Impact if occurs' },
      { name: 'velocity', weight: 0.1, min: 1, max: 5, description: 'Speed of materialization' },
      { name: 'vulnerability', weight: 0.1, min: 1, max: 5, description: 'System vulnerability' },
      { name: 'historicalData', weight: 0.05, min: 1, max: 5, description: 'Historical occurrence' },
      { name: 'externalFactors', weight: 0.05, min: 1, max: 5, description: 'External influences' }
    ],
    thresholds: {
      low: 25,
      medium: 50,
      high: 75,
      critical: 90
    },
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
