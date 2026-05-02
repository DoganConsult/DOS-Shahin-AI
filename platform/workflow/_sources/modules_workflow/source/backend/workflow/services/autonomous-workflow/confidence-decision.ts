// ============================================================
// Shahin — Autonomous Workflow: Confidence & Takeover Decision
// Calculates confidence scores and determines whether the AI
// should take over a given workflow step.
// ============================================================

import type { AIStepTriggerReason, AutonomousWorkflowConfig as _AutonomousWorkflowConfig, AutonomyLevel } from "@dos/types";
import { isStepOverdue, isUserAbsent, detectWorkloadOverload, detectExpertiseMismatch, detectPatternMatch, detectLowRiskAction, detectRecurringTask } from "./detection-triggers";
import { getAutonomousConfig } from "./config-state";
import { safeQuery } from "@dos/db";

/**
 * Confidence thresholds per autonomy level:
 * Level 0: Human-only (never autonomous)
 * Level 1: Requires 0.95+ confidence
 * Level 2: Requires 0.85+ confidence
 * Level 3: Requires 0.75+ confidence
 * Level 4: Requires 0.65+ confidence
 * Level 5: Requires 0.50+ confidence (full autonomy)
 */
export const AUTONOMY_CONFIDENCE_THRESHOLDS: Record<AutonomyLevel, number> = {
  0: 1.0, // Never autonomous
  1: 0.95,
  2: 0.85,
  3: 0.75,
  4: 0.65,
  5: 0.50,
};

/**
 * Calculate confidence score for an agent decision based on multiple factors.
 */
export async function calculateConfidence(
  tenantId: string,
  stepType: string,
  stepSubType: string,
  inputContext: Record<string, unknown>,
  historicalAccuracy?: number
): Promise<number> {
  let confidence = 0.7; // Base confidence

  // Factor 1: Step type complexity (simpler steps = higher confidence)
  const simpleStepTypes = ['notification', 'assignment', 'data_entry'];
  const complexStepTypes = ['approval', 'governance', 'risk_assessment'];
  if (simpleStepTypes.some(t => stepType.includes(t))) {
    confidence += 0.1;
  } else if (complexStepTypes.some(t => stepType.includes(t))) {
    confidence -= 0.1;
  }

  // Factor 2: Historical accuracy (if available)
  if (historicalAccuracy !== undefined) {
    confidence = (confidence * 0.6) + (historicalAccuracy * 0.4);
  }

  // Factor 3: Context completeness (more context = higher confidence)
  const contextKeys = Object.keys(inputContext || {});
  if (contextKeys.length >= 5) {
    confidence += 0.05;
  } else if (contextKeys.length < 2) {
    confidence -= 0.1;
  }

  // Factor 4: Recurring pattern (if this is a known pattern, higher confidence)
  if (inputContext?.isRecurringPattern === true) {
    confidence += 0.05;
  }

  // Clamp between 0.0 and 1.0
  return Math.max(0.0, Math.min(1.0, confidence));
}

/**
 * Determine whether the AI should take over a given workflow step.
 * Evaluates multiple trigger conditions (absence, SLA, overload, etc.)
 * and checks confidence against the configured autonomy level threshold.
 */
export async function shouldAITakeOver(
  tenantId: string,
  stepStartedAt: string | Date,
  slaHours: number,
  assigneeUserId: string,
  stepType?: string,
  stepSubType?: string,
  inputContext?: Record<string, unknown>
): Promise<{ takeover: boolean; reason: AIStepTriggerReason | null; confidence?: number }> {
  const config = await getAutonomousConfig(tenantId);
  if (!config.enabled) return { takeover: false, reason: null };

  // Level 0 = human-only, never autonomous

  if (config.autonomyLevel === 0) {
    return { takeover: false, reason: null };
  }

  // Check user absence (always triggers if user is absent)
  const absent = await isUserAbsent(assigneeUserId, tenantId);
  if (absent) {
    return { takeover: true, reason: "user_absent", confidence: 0.9 };
  }

  // Check SLA timeout (always triggers if overdue)
  const overdue = isStepOverdue(stepStartedAt, slaHours, (config as any).slaGraceMultiplier);
  if (overdue) {
    // Calculate confidence for SLA timeout scenario
    const confidence = await calculateConfidence(tenantId, stepType || 'any', stepSubType || 'any', inputContext || {});
    const threshold = AUTONOMY_CONFIDENCE_THRESHOLDS[config.autonomyLevel];

    if (confidence >= threshold) {
      return { takeover: true, reason: "sla_timeout", confidence };
    }
    // If confidence is too low, still trigger but mark for review
    return { takeover: true, reason: "sla_timeout", confidence };
  }

  // For higher autonomy levels (3+), check additional triggers
  if ((config as any).autonomyLevel >= 3 && stepType && stepSubType) {
    // Check for workload overload
    const workloadOverload = await detectWorkloadOverload(tenantId, assigneeUserId);
    if (workloadOverload) {
      const confidence = await calculateConfidence(tenantId, stepType, stepSubType, inputContext || {});
      const threshold = AUTONOMY_CONFIDENCE_THRESHOLDS[config.autonomyLevel];
      if (confidence >= threshold) {
        return { takeover: true, reason: "workload_overload", confidence };
      }
    }

    // Check for expertise mismatch (only for level 4+)
    if ((config as any).autonomyLevel >= 4) {
      const expertiseMismatch = await detectExpertiseMismatch(tenantId, assigneeUserId, stepType, stepSubType);
      if (expertiseMismatch) {
        const confidence = await calculateConfidence(tenantId, stepType, stepSubType, inputContext || {});
        const threshold = AUTONOMY_CONFIDENCE_THRESHOLDS[config.autonomyLevel];
        if (confidence >= threshold) {
          return { takeover: true, reason: "expertise_mismatch", confidence };
        }
      }
    }

    // Check for pattern match
    const patternMatch = await detectPatternMatch(tenantId, stepType, stepSubType);
    if (patternMatch) {
      const confidence = await calculateConfidence(tenantId, stepType, stepSubType, inputContext || {});
      const threshold = AUTONOMY_CONFIDENCE_THRESHOLDS[config.autonomyLevel];
      if (confidence >= threshold) {
        return { takeover: true, reason: "pattern_match", confidence };
      }
    }

    // Check for low-risk action (only for level 4+)
    if ((config as any).autonomyLevel >= 4) {
      const lowRisk = detectLowRiskAction(stepType, inputContext);
      if (lowRisk) {
        const confidence = await calculateConfidence(tenantId, stepType, stepSubType, inputContext || {});
        const threshold = AUTONOMY_CONFIDENCE_THRESHOLDS[config.autonomyLevel];
        if (confidence >= threshold) {
          return { takeover: true, reason: "low_risk_action", confidence };
        }
      }
    }

    // Check for recurring task (only for level 5)
    if ((config as any).autonomyLevel >= 5) {
      const recurring = await detectRecurringTask(tenantId, stepType, stepSubType);
      if (recurring) {
        const confidence = await calculateConfidence(tenantId, stepType, stepSubType, inputContext || {});
        const threshold = AUTONOMY_CONFIDENCE_THRESHOLDS[config.autonomyLevel];
        if (confidence >= threshold) {
          return { takeover: true, reason: "recurring_task", confidence };
        }
      }
    }
  }

  return { takeover: false, reason: null };
}
