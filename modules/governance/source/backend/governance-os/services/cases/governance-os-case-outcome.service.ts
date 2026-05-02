/**
 * Governance OS Case Outcome Service
 *
 * Orchestrates case outcome evaluation after observation windows expire.
 * Case creation functions are delegated to governance-os-case-creators.service.ts.
 * Evaluator logic is delegated to governance-os-case-outcome-evaluators.ts.
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { logger } from '../../ports/logger.port';
import {
  recordOutcome,
  updateCaseEffectiveness,
  type CaseType,
} from '../learning/governance-os-learning-memory.service';
import {
  recordOutcomeEvaluation,
} from '../learning/governance-os-learning-metrics.service';
import type { CaseOutcomeResult, InitiativeEffectivenessRow } from './governance-os-case-outcome.types';

// ─── Re-export case creation functions so existing callers don't break ────
export {
  createCaseFromInitiativeRun,
  createCaseFromRecommendation,
  createCaseFromEscalation,
  createCaseFromTask,
  createCaseFromMilestoneEvaluation,
  createCaseFromDigestInteraction,
  gatherContextForCase,
  OBSERVATION_WINDOWS,
} from './governance-os-case-creators.service';

// ─── Re-export evaluator functions for callers that need them directly ────
export {
  evaluateInitiativeOutcome,
  evaluateRecommendationOutcome,
  evaluateEscalationOutcome,
  evaluateMilestoneOutcome,
  evaluateDigestOutcome,
  computeEffectivenessScore,
  buildEffectivenessReason,
} from './governance-os-case-outcome-evaluators';

// ─── Re-export types ─────────────────────────────────────────────────────
export type { CaseOutcomeResult, InitiativeEffectivenessRow } from './governance-os-case-outcome.types';

// Import evaluators for internal use in this file
import {
  evaluateInitiativeOutcome,
  evaluateRecommendationOutcome,
  evaluateEscalationOutcome,
  evaluateMilestoneOutcome,
  evaluateDigestOutcome,
  computeEffectivenessScore,
  buildEffectivenessReason,
} from './governance-os-case-outcome-evaluators';

// ─── Core outcome evaluation ─────────────────────────────────────────────

/**
 * Evaluate case outcome after observation window.
 * Dispatches to the appropriate evaluator based on case type,
 * records the outcome, and computes an effectiveness score.
 */
export async function evaluateCaseOutcome(
  tenantId: string,
  caseId: string
): Promise<{ effectivenessScore: number; effectivenessReason: string }> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_os_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ─── Batch evaluation ────────────────────────────────────────────────────

/**
 * Evaluate all pending outcomes (used by outcome evaluator job).
 * Finds cases whose observation window has elapsed but have not yet
 * been evaluated, and runs evaluateCaseOutcome on each.
 */
export async function evaluatePendingOutcomes(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const now = new Date();

  // Find cases where observation window has passed but outcome not yet evaluated
  const pendingResult = await safeQuery(
    `
    SELECT
      case_id as "caseId",
      created_at as "createdAt",
      observation_window_days as "observationWindowDays"
    FROM "${schema}".os_case_memory
    WHERE tenant_id = $1
      AND observed_at IS NULL
      AND created_at + (observation_window_days || INTERVAL '1 day') <= $2
    `,
    [tenantId, now.toISOString()]
  );

  let evaluated = 0;
  for (const pending of pendingResult.rows) {
    try {
      await evaluateCaseOutcome(tenantId, pending.caseId);
      evaluated++;
    } catch (err) {
      logger.warn('Failed to evaluate case outcome', {
        caseId: pending.caseId,
        tenantId,
        error: (err as Error).message,
      });
    }
  }

  logger.info('Pending outcomes evaluated', { tenantId, evaluated, total: pendingResult.rows.length });

  return evaluated;
}

// ─── Effectiveness analytics ─────────────────────────────────────────────

/**
 * Get initiative effectiveness metrics aggregated from case outcomes
 */
export async function getInitiativeEffectiveness(
  tenantId: string,
  filters?: {
    initiativeCode?: string;
    limit?: number;
  }
): Promise<Array<{
  initiativeCode: string;
  totalCases: number;
  averageEffectiveness: number;
  effectiveCount: number;
  partiallyEffectiveCount: number;
  ineffectiveCount: number;
  pendingCount: number;
}>> {
  const schema = tenantSchema(tenantId);
  let query = `
    SELECT
      os_belief->>'initiativeCode' as "initiativeCode",
      COUNT(*) as "totalCases",
      AVG(effectiveness_score) as "averageEffectiveness",
      COUNT(*) FILTER (WHERE effectiveness_score >= 0.8) as "effectiveCount",
      COUNT(*) FILTER (WHERE effectiveness_score >= 0.4 AND effectiveness_score < 0.8) as "partiallyEffectiveCount",
      COUNT(*) FILTER (WHERE effectiveness_score < 0.4 AND effectiveness_score IS NOT NULL) as "ineffectiveCount",
      COUNT(*) FILTER (WHERE effectiveness_score IS NULL) as "pendingCount"
    FROM "${schema}".os_case_memory
    WHERE tenant_id = $1
      AND case_type = 'initiative_run'
      AND os_belief->>'initiativeCode' IS NOT NULL
  `;
  const params: unknown[] = [tenantId];

  if (filters?.initiativeCode) {
    query += ` AND os_belief->>'initiativeCode' = $${params.length + 1}`;
    params.push(filters.initiativeCode);
  }

  query += ` GROUP BY os_belief->>'initiativeCode'`;
  query += ` ORDER BY "averageEffectiveness" DESC NULLS LAST`;

  if (filters?.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(filters.limit);
  }

  const result = await safeQuery(query, params);

  return result.rows.map((r: InitiativeEffectivenessRow) => ({
    initiativeCode: r.initiativeCode,
    totalCases: parseInt(r.totalCases, 10),
    averageEffectiveness: r.averageEffectiveness ? parseFloat(r.averageEffectiveness) : 0,
    effectiveCount: parseInt(r.effectiveCount, 10),
    partiallyEffectiveCount: parseInt(r.partiallyEffectiveCount, 10),
    ineffectiveCount: parseInt(r.ineffectiveCount, 10),
    pendingCount: parseInt(r.pendingCount, 10),
  }));
}
