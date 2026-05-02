// ============================================================
// Shahin — Autonomous Workflow: Detection & Trigger Helpers
// Functions for detecting when AI should intervene in a
// workflow step (absence, overload, expertise, patterns, etc.).
// ============================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import type { AbsenceStatus } from "@dos/types";

/**
 * Coaching prompt prefix used by guidance/autofill AI calls.
 * Exported for use in tests and downstream services.
 */
export const COACHING_PROMPT_PREFIX =
  "You are coaching and supporting the GRC operator through this workflow step. " +
  "Provide helpful, actionable suggestions in a supportive tone. " +
  "Do NOT evaluate, grade, or audit their work. " +
  "You are a mentor and guide — lead them, do not examine them. " +
  "Always consider KSA regulatory context (NCA, SAMA, PDPL, SDAIA) where relevant. " +
  "Respond in both English and Arabic where possible.\n\n";

/**
 * Check whether a workflow step is overdue given its SLA.
 */
export function isStepOverdue(
  stepStartedAt: string | Date,
  slaHours: number,
  graceMultiplier: number = 1.0,
  now: Date = new Date()
): boolean {
  if (slaHours <= 0) return true;
  if (!Number.isFinite(slaHours)) return false;
  const startMs = new Date(stepStartedAt).getTime();
  const effectiveSlaMs = slaHours * graceMultiplier * 60 * 60 * 1000;
  return now.getTime() > startMs + effectiveSlaMs;
}

/**
 * Check whether the given user is currently marked as absent/OOO.
 */
export async function isUserAbsent(userId: string, tenantId: string): Promise<boolean> {
  const sql = `SELECT absence_status, absent_until FROM users WHERE user_id = $1 AND tenant_id = $2`;
  const params = [userId, tenantId];
  const result = await safeQuery(sql, params);
  if (result.rows.length === 0) return false;

  const row = getFirstRow(result)!;
  const status = row.absence_status as AbsenceStatus;

  if (status === "absent" || status === "ooo") {
    if (row.absent_until) {
      return new Date() < new Date(row.absent_until);
    }
    return true;
  }
  return false;
}

/**
 * Check if user has excessive workload (too many open tasks).
 * Threshold: 15+ open tasks indicates overload.
 */
export async function detectWorkloadOverload(
  tenantId: string,
  assigneeUserId: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS open_count
       FROM "${schema}".remediation_tasks
       WHERE assigned_to = $1 AND status NOT IN ('completed', 'resolved', 'cancelled')`,
      [assigneeUserId]
    );
    const openCount = getFirstRow(result)?.open_count || 0;
    return openCount >= 15; // Threshold: 15+ open tasks
  } catch {
    return false;
  }
}

/**
 * Check if user's expertise matches the step requirements.
 * Simplified: checks if user has handled similar steps before.
 * Future: would check against user skills/expertise profile.
 */
export async function detectExpertiseMismatch(
  tenantId: string,
  assigneeUserId: string,
  stepType: string,
  _stepSubType: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    // Check if user has completed similar steps before
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS similar_count
       FROM "${schema}".workflow_instances wi
       JOIN "${schema}".workflow_step_log wsl ON wsl.workflow_execution_id = wi.execution_id
       WHERE wi.assigned_to = $1
         AND wsl.step_type = $2
         AND wsl.status = 'completed'
         AND wsl.completed_at >= NOW() - INTERVAL '90 days'`,
      [assigneeUserId, stepType]
    );
    const similarCount = getFirstRow(result)?.similar_count || 0;
    // If user has never completed a similar step, consider it a mismatch
    return similarCount === 0;
  } catch {
    return false;
  }
}

/**
 * Check if this step matches a known recurring pattern.
 * Simplified: checks if this step type has been executed frequently.
 */
export async function detectPatternMatch(
  tenantId: string,
  stepType: string,
  _stepSubType: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS pattern_count
       FROM "${schema}".workflow_step_log
       WHERE step_type = $1 AND status = 'completed'
         AND completed_at >= NOW() - INTERVAL '30 days'`,
      [stepType]
    );
    const patternCount = getFirstRow(result)?.pattern_count || 0;
    // If this step type has been executed 10+ times in last 30 days, it's a pattern
    return patternCount >= 10;
  } catch {
    return false;
  }
}

/**
 * Check if this is a low-risk action that can be safely automated.
 * Simplified: certain step types are considered low-risk.
 */
export function detectLowRiskAction(stepType: string, inputContext?: Record<string, unknown>): boolean {
  const lowRiskStepTypes = ['notification', 'assignment', 'data_entry', 'reminder'];
  const highRiskStepTypes = ['approval', 'governance', 'risk_assessment', 'financial'];

  if (lowRiskStepTypes.some(t => stepType.includes(t))) {
    return true;
  }
  if (highRiskStepTypes.some(t => stepType.includes(t))) {
    return false;
  }

  // Check context for risk indicators
  if (inputContext?.riskLevel === 'low' || inputContext?.severity === 'low') {
    return true;
  }

  return false;
}

/**
 * Check if this is a recurring task (executed regularly).
 * Simplified: checks if similar steps have been executed multiple times recently.
 */
export async function detectRecurringTask(
  tenantId: string,
  stepType: string,
  stepSubType: string
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS recurrence_count
       FROM "${schema}".workflow_step_log
       WHERE step_type = $1 AND step_subtype = $2 AND status = 'completed'
         AND completed_at >= NOW() - INTERVAL '7 days'`,
      [stepType, stepSubType]
    );
    const recurrenceCount = getFirstRow(result)?.recurrence_count || 0;
    // If this exact step has been executed 3+ times in last 7 days, it's recurring
    return recurrenceCount >= 3;
  } catch {
    return false;
  }
}
