// ============================================================
// Shahin — Autonomous Workflow: Review Queue
// AI step execution review queue and human review operations.
// ============================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import type { AIStepExecution } from "@dos/types";
import { TENANT_ID_RE } from "./tenant-lock";

/**
 * Map a database row to an AIStepExecution object.
 */
export function mapRowToExecution(row: Record<string, unknown>): AIStepExecution {
  return {

    executionId: row.execution_id,
    workflowExecutionId: row.workflow_execution_id,

    stepId: row.step_id,
    agentId: row.agent_id,
    agentUserId: row.agent_user_id,
    triggerReason: row.trigger_reason,
    inputContext: row.input_context || {},
    outputResult: row.output_result || {},
    confidence: parseFloat((row as any).confidence || "0"),

    status: row.status,
    humanReviewed: row.human_reviewed,
    reviewDecision: row.review_decision,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at,
  };
}

/**
 * Get the AI review queue for a tenant (pending human review items).
 */
export async function getAIQueue(
  tenantId: string,
  userId?: string
): Promise<{ items: AIStepExecution[]; count: number }> {
  if (!tenantId || typeof tenantId !== "string" || !TENANT_ID_RE.test(tenantId)) {
    return { items: [], count: 0 };
  }
  const schema = tenantSchema(tenantId);

  try {
    let sql = `SELECT * FROM "${schema}".ai_step_executions WHERE status = 'pending_review' AND human_reviewed = FALSE`;
    const params: unknown[] = [];

    if (userId) {
      sql += ` AND agent_user_id = $1`;
      params.push(userId);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await safeQuery(sql, params);
    const items: AIStepExecution[] = result.rows.map(mapRowToExecution);
    return { items, count: items.length };
  } catch (err: unknown) {

    const msg = err?.message || "";
    if (
      /relation .* does not exist|schema .* does not exist/i.test(msg)
    ) {
      return { items: [], count: 0 };
    }
    throw err;
  }
}

/**
 * Submit a human review decision for an AI step execution.
 */
export async function reviewAIStep(
  tenantId: string,
  executionId: string,
  decision: "accepted" | "rejected" | "modified",
  reviewedBy: string
): Promise<{ reviewed: true; decision: string }> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".ai_step_executions
     SET human_reviewed = TRUE, review_decision = $1, reviewed_by = $2, reviewed_at = NOW(),
         status = CASE WHEN $1 = 'rejected' THEN 'failed' ELSE 'completed' END
     WHERE execution_id = $3`,
    [decision, reviewedBy, executionId]
  );

  await recordAudit({
    tenantId,
    userId: reviewedBy,
    module: "autonomous_workflow",
    action: "update",
    entityType: "ai_step_execution",
    entityId: executionId,
    afterState: { decision, reviewedBy },
  });

  return { reviewed: true, decision };
}
