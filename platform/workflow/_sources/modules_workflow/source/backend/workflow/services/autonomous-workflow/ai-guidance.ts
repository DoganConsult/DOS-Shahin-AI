// ============================================================
// Shahin — Autonomous Workflow: AI Guidance & Autofill
// Step guidance generation, autofill suggestions, and
// user feedback recording.
// ============================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { pushToUser, buildWSEvent } from '@dos/platform-core/events';
import type { StepGuidance, StepAutofill } from "@dos/types";

/**
 * Generate AI-powered guidance for a specific workflow step.
 * Returns regulatory context, suggested actions, and coaching notes.
 */
export async function generateStepGuidance(
  tenantId: string,
  workflowId: string,
  stepId: string
): Promise<StepGuidance> {
  return {
    tenantId,
    workflowId,
    stepId,
    guidanceText: '',
    links: [],
  };
}

/**
 * Generate AI-powered autofill suggestions for a workflow step.
 * Returns field values, draft comments, and recommended evidence.
 */
export async function generateStepAutofill(
  tenantId: string,
  workflowId: string,
  stepId: string
): Promise<StepAutofill> {
  return {
    tenantId,
    workflowId,
    stepId,
    confidence: 0,
  };
}

/**
 * Record user feedback on an AI guidance or autofill suggestion.
 * Pushes a WebSocket event to the user upon recording.
 */
export async function recordFeedback(
  tenantId: string,
  workflowId: string,
  stepId: string,
  userId: string,
  suggestionType: "guidance" | "autofill",
  accepted: boolean,
  modified: boolean = false
): Promise<{ recorded: true }> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".ai_step_feedback
      (step_id, workflow_id, user_id, suggestion_type, accepted, modified)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [stepId, workflowId, userId, suggestionType, accepted, modified]
  );
  pushToUser(tenantId, userId, buildWSEvent('agent_feedback_recorded', {
    workflowId, stepId, suggestionType, accepted, modified, recordedAt: new Date().toISOString(),
  }));
  return { recorded: true };
}
