// ============================================
// Governance OS Learning Health Service
// Health checks and diagnostics for learning engine
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';

export interface LearningEngineHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastReflectionCycle?: string;
  lastOutcomeEvaluation?: string;
  lastScoreComputation?: string;
  casesInQueue: number;
  scoresStale: number;
  patternsDetected: number;
  lessonCandidatesPending: number;
  warnings: string[];
  metrics: {
    totalCases: number;
    evaluatedCases: number;
    averageEffectiveness: number;
    highConfidencePatterns: number;
  };
}

/**
 * Get comprehensive health status of learning engine
 */
export async function getLearningEngineHealth(tenantId: string): Promise<LearningEngineHealth> {
  const schema = tenantSchema(tenantId);
  const warnings: string[] = [];
  const metrics: LearningEngineHealth['metrics'] = {
    totalCases: 0,
    evaluatedCases: 0,
    averageEffectiveness: 0,
    highConfidencePatterns: 0,
  };

  try {
    // Check last reflection cycle
    const lastCycle = await safeQuery(
      `SELECT MAX(created_at) as last_cycle
       FROM "${schema}".os_reflection_notes
       WHERE tenant_id = $1`,
      [tenantId]
    );
    const lastReflectionCycle = lastCycle.rows[0]?.last_cycle;
    if (!lastReflectionCycle || new Date(lastReflectionCycle) < new Date(Date.now() - 86400000)) {
      warnings.push('No reflection cycle in last 24 hours');
    }

    // Check last outcome evaluation
    const lastOutcome = await safeQuery(
      `SELECT MAX(observed_at) as last_evaluation
       FROM "${schema}".os_case_memory
       WHERE tenant_id = $1 AND observed_at IS NOT NULL`,
      [tenantId]
    );
    const lastOutcomeEvaluation = lastOutcome.rows[0]?.last_evaluation;

    // Check last score computation
    const lastScore = await safeQuery(
      `SELECT MAX(computed_at) as last_computed
       FROM "${schema}".os_learning_scores
       WHERE tenant_id = $1`,
      [tenantId]
    );
    const lastScoreComputation = lastScore.rows[0]?.last_computed;
    if (!lastScoreComputation || new Date(lastScoreComputation) < new Date(Date.now() - 7 * 86400000)) {
      warnings.push('No score computation in last 7 days');
    }

    // Count pending cases
    const pendingCases = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".os_case_memory
       WHERE tenant_id = $1 AND observed_at IS NULL`,
      [tenantId]
    );
    const casesInQueue = parseInt(pendingCases.rows[0]?.count || '0');
    if (casesInQueue > 1000) {
      warnings.push(`${casesInQueue} cases pending evaluation (high backlog)`);
    }

    // Count stale scores (older than 7 days)
    const staleScores = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".os_learning_scores
       WHERE tenant_id = $1 
         AND computed_at < NOW() - INTERVAL '7 days'`,
      [tenantId]
    );
    const scoresStale = parseInt(staleScores.rows[0]?.count || '0');
    if (scoresStale > 10) {
      warnings.push(`${scoresStale} learning scores are stale (>7 days old)`);
    }

    // Count recent patterns
    const recentPatterns = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".os_pattern_signals
       WHERE tenant_id = $1 
         AND created_at > NOW() - INTERVAL '7 days'`,
      [tenantId]
    );
    const patternsDetected = parseInt(recentPatterns.rows[0]?.count || '0');

    // Count pending lesson candidates
    const pendingLessons = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".os_lesson_candidates
       WHERE tenant_id = $1 AND status = 'pending_review'`,
      [tenantId]
    );
    const lessonCandidatesPending = parseInt(pendingLessons.rows[0]?.count || '0');
    if (lessonCandidatesPending > 50) {
      warnings.push(`${lessonCandidatesPending} lesson candidates pending review`);
    }

    // Get metrics
    const totalCasesResult = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".os_case_memory
       WHERE tenant_id = $1`,
      [tenantId]
    );
    metrics.totalCases = parseInt(totalCasesResult.rows[0]?.count || '0');

    const evaluatedCasesResult = await safeQuery(
      `SELECT COUNT(*) as count, AVG(effectiveness_score) as avg_effectiveness
       FROM "${schema}".os_case_memory
       WHERE tenant_id = $1 AND effectiveness_score IS NOT NULL`,
      [tenantId]
    );
    metrics.evaluatedCases = parseInt(evaluatedCasesResult.rows[0]?.count || '0');
    metrics.averageEffectiveness = parseFloat(evaluatedCasesResult.rows[0]?.avg_effectiveness || '0');

    const highConfidencePatternsResult = await safeQuery(
      `SELECT COUNT(*) as count
       FROM "${schema}".os_pattern_signals
       WHERE tenant_id = $1 AND confidence >= 0.7`,
      [tenantId]
    );
    metrics.highConfidencePatterns = parseInt(highConfidencePatternsResult.rows[0]?.count || '0');

    // Determine status
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (warnings.length > 3 || casesInQueue > 2000 || scoresStale > 50) {
      status = 'unhealthy';
    } else if (warnings.length > 0 || scoresStale > 5 || casesInQueue > 500) {
      status = 'degraded';
    }

    return {
      status,
      lastReflectionCycle: lastReflectionCycle,
      lastOutcomeEvaluation: lastOutcomeEvaluation,
      lastScoreComputation: lastScoreComputation,
      casesInQueue,
      scoresStale,
      patternsDetected,
      lessonCandidatesPending,
      warnings,
      metrics,
    };
  } catch (err) {
    logger.error('[LearningHealth] Health check failed', {
      tenantId,
      error: (err as Error).message,
      stack: (err as Error).stack,
    });
    return {
      status: 'unhealthy',
      casesInQueue: 0,
      scoresStale: 0,
      patternsDetected: 0,
      lessonCandidatesPending: 0,
      warnings: [`Health check error: ${(err as Error).message}`],
      metrics: {
        totalCases: 0,
        evaluatedCases: 0,
        averageEffectiveness: 0,
        highConfidencePatterns: 0,
      },
    };
  }
}

/**
 * Get quick health status (lightweight)
 */
export async function getQuickHealthStatus(tenantId: string): Promise<{
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCycle?: string;
  pendingCount: number;
}> {
  const schema = tenantSchema(tenantId);

  try {
    const [lastCycle, pending] = await Promise.all([
      safeQuery(
        `SELECT MAX(created_at) as last_cycle
         FROM "${schema}".os_reflection_notes
         WHERE tenant_id = $1`,
        [tenantId]
      ),
      safeQuery(
        `SELECT COUNT(*) as count
         FROM "${schema}".os_case_memory
         WHERE tenant_id = $1 AND observed_at IS NULL`,
        [tenantId]
      ),
    ]);

    const lastCycleTime = lastCycle.rows[0]?.last_cycle;
    const pendingCount = parseInt(pending.rows[0]?.count || '0');

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (pendingCount > 1000) {
      status = 'unhealthy';
    } else if (pendingCount > 500 || !lastCycleTime || new Date(lastCycleTime) < new Date(Date.now() - 86400000)) {
      status = 'degraded';
    }

    return {
      status,
      lastCycle: lastCycleTime,
      pendingCount,
    };
  } catch (err) {
    logger.error('[LearningHealth] Quick health check failed', {
      tenantId,
      error: (err as Error).message,
    });
    return {
      status: 'unhealthy',
      pendingCount: 0,
    };
  }
}
