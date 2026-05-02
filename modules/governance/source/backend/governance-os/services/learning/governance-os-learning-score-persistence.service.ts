// ============================================
// Shahin-Ai — Governance OS Learning Score Persistence
// Phase D: Database persistence, retrieval, and aggregation helpers
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import {
  getCachedLearningScore,
} from './governance-os-learning-cache.service';
import type { ScopeType, Trend, LearningMetrics, LearningScore } from './governance-os-learning-score.types';
import type { GenericRow } from '@dos/types';

/**
 * Save learning score to database (insert or update)
 */
export async function saveLearningScore(tenantId: string, score: LearningScore): Promise<string | null> {
  const schema = tenantSchema(tenantId);
  try {
    // Check if score already exists for this period
    const existing = await safeQuery(
      `
      SELECT score_id
      FROM "${schema}".os_learning_scores
      WHERE tenant_id = $1
        AND scope_type = $2
        AND scope_key = $3
        AND period_start = $4
        AND period_end = $5
      `,
      [tenantId, score.scopeType, score.scopeKey, score.periodStart, score.periodEnd]
    );

    if (existing.rows.length > 0) {
      // Update existing
      const result = await safeQuery(
        `
        UPDATE "${schema}".os_learning_scores
        SET
          metrics = $6,
          overall_learning_score = $7,
          trend = $8,
          computed_at = NOW()
        WHERE score_id = $9
        RETURNING score_id
        `,
        [
          JSON.stringify(score.metrics),
          score.overallLearningScore,
          score.trend,
          existing.rows[0].score_id,
        ]
      );
      return result.rows[0]?.score_id || null;
    } else {
      // Insert new
      const result = await safeQuery(
        `
        INSERT INTO "${schema}".os_learning_scores
          (tenant_id, scope_type, scope_key, period_start, period_end, metrics, overall_learning_score, trend)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING score_id
        `,
        [
          tenantId,
          score.scopeType,
          score.scopeKey,
          score.periodStart,
          score.periodEnd,
          JSON.stringify(score.metrics),
          score.overallLearningScore,
          score.trend,
        ]
      );
      return result.rows[0]?.score_id || null;
    }
  } catch (err) {
    logger.error('[LearningScore] Failed to save learning score', {
      tenantId,
      error: (err as Error).message,
    });
    return null;
  }
}

/**
 * Get learning scores with filters (with caching)
 */
export async function getLearningScores(
  tenantId: string,
  filters?: {
    scopeType?: ScopeType;
    scopeKey?: string;
    limit?: number;
  }
): Promise<LearningScore[]> {
  // Try cache for single scope lookup
  if (filters?.scopeType && filters?.scopeKey && !filters?.limit) {
    const cached = await getCachedLearningScore(tenantId, filters.scopeType, filters.scopeKey);
    if (cached) {
      logger.debug('[LearningScore] Cache hit for getLearningScores', {
        tenantId,
        scopeType: filters.scopeType,
        scopeKey: filters.scopeKey,
      });
      return [cached];
    }
  }

  const schema = tenantSchema(tenantId);
  try {
    let query = `
      SELECT
        score_id as "scoreId",
        tenant_id as "tenantId",
        scope_type as "scopeType",
        scope_key as "scopeKey",
        period_start as "periodStart",
        period_end as "periodEnd",
        metrics,
        overall_learning_score as "overallLearningScore",
        trend,
        computed_at as "computedAt",
        created_at as "createdAt"
      FROM "${schema}".os_learning_scores
      WHERE tenant_id = $1
    `;
    const params: unknown[] = [tenantId];

    if (filters?.scopeType) {
      query += ` AND scope_type = $${params.length + 1}`;
      params.push(filters.scopeType);
    }

    if (filters?.scopeKey) {
      query += ` AND scope_key = $${params.length + 1}`;
      params.push(filters.scopeKey);
    }

    query += ` ORDER BY period_end DESC`;

    if (filters?.limit) {
      query += ` LIMIT $${params.length + 1}`;
      params.push(filters.limit);
    }

    const result = await safeQuery(query, params);

    return result.rows.map((r: GenericRow) => ({
      scoreId: r.scoreId,
      tenantId: r.tenantId,
      scopeType: r.scopeType,
      scopeKey: r.scopeKey,
      periodStart: r.periodStart,
      periodEnd: r.periodEnd,
      metrics: typeof r.metrics === 'string' ? JSON.parse(r.metrics) : r.metrics,
      overallLearningScore: parseFloat(r.overallLearningScore || '0'),
      trend: r.trend,
      computedAt: r.computedAt,
      createdAt: r.createdAt,
    }));
  } catch (err) {
    logger.error('[LearningScore] Failed to get learning scores', {
      tenantId,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Compute overall learning score (weighted average, normalized to 0-1)
 */
export function computeOverallScore(metrics: LearningMetrics): number {
  // Weights (sum to 1.0)
  const weights = {
    repeatIssueRate: 0.15, // Lower is better, so invert
    firstTimeResolutionRate: 0.15, // Higher is better
    timeToResolutionTrend: 0.10, // Negative is better, so invert and normalize
    overdueRecurrenceRate: 0.10, // Lower is better, so invert
    ownerResponsiveness: 0.10, // Higher is better
    recommendationAcceptanceRate: 0.10, // Higher is better
    milestoneCompletionReliability: 0.10, // Higher is better
    escalationNecessityRate: 0.10, // Lower is better, so invert
    evidenceSufficiency: 0.05, // Higher is better
    maturityMovement: 0.05, // Positive is better, normalize from -1..1 to 0..1
  };

  // Normalize each metric to 0-1 (where 1 = best)
  const normalized = {
    repeatIssueRate: 1 - metrics.repeatIssueRate, // Invert
    firstTimeResolutionRate: metrics.firstTimeResolutionRate,
    timeToResolutionTrend: (1 - metrics.timeToResolutionTrend) / 2, // Normalize from -1..1 to 0..1
    overdueRecurrenceRate: 1 - metrics.overdueRecurrenceRate, // Invert
    ownerResponsiveness: metrics.ownerResponsiveness,
    recommendationAcceptanceRate: metrics.recommendationAcceptanceRate,
    milestoneCompletionReliability: metrics.milestoneCompletionReliability,
    escalationNecessityRate: 1 - metrics.escalationNecessityRate, // Invert
    evidenceSufficiency: metrics.evidenceSufficiency,
    maturityMovement: (metrics.maturityMovement + 1) / 2, // Normalize from -1..1 to 0..1
  };

  // Weighted sum
  const overall =
    normalized.repeatIssueRate * weights.repeatIssueRate +
    normalized.firstTimeResolutionRate * weights.firstTimeResolutionRate +
    normalized.timeToResolutionTrend * weights.timeToResolutionTrend +
    normalized.overdueRecurrenceRate * weights.overdueRecurrenceRate +
    normalized.ownerResponsiveness * weights.ownerResponsiveness +
    normalized.recommendationAcceptanceRate * weights.recommendationAcceptanceRate +
    normalized.milestoneCompletionReliability * weights.milestoneCompletionReliability +
    normalized.escalationNecessityRate * weights.escalationNecessityRate +
    normalized.evidenceSufficiency * weights.evidenceSufficiency +
    normalized.maturityMovement * weights.maturityMovement;

  return Math.max(0, Math.min(1, overall)); // Clamp to 0-1
}

/**
 * Determine trend by comparing with previous period
 */
export async function determineTrend(
  tenantId: string,
  scopeType: ScopeType,
  scopeKey: string,
  periodStart: Date,
  periodEnd: Date,
  currentScore: number
): Promise<Trend> {
  const schema = tenantSchema(tenantId);
  try {
    // Get previous period score
    const periodDuration = periodEnd.getTime() - periodStart.getTime();
    const prevPeriodStart = new Date(periodStart.getTime() - periodDuration);
    const prevPeriodEnd = periodStart;

    const result = await safeQuery(
      `
      SELECT overall_learning_score
      FROM "${schema}".os_learning_scores
      WHERE tenant_id = $1
        AND scope_type = $2
        AND scope_key = $3
        AND period_start = $4
        AND period_end = $5
      ORDER BY computed_at DESC
      LIMIT 1
      `,
      [tenantId, scopeType, scopeKey, prevPeriodStart.toISOString(), prevPeriodEnd.toISOString()]
    );

    if (result.rows.length === 0) {
      return 'stable'; // No previous data
    }

    const previousScore = parseFloat(result.rows[0].overall_learning_score || '0');
    const delta = currentScore - previousScore;

    // Threshold: 0.05 change = significant
    if (delta > 0.05) return 'improving';
    if (delta < -0.05) return 'degrading';
    return 'stable';
  } catch (err) {
    logger.error('[LearningScore] Failed to determine trend', {
      tenantId,
      error: (err as Error).message,
    });
    return 'stable';
  }
}

export async function computeLearningScore(tenantId: string, moduleCode: string): Promise<Record<string, unknown>> {
  return { tenantId, moduleCode, score: 0, computed: false };
}
