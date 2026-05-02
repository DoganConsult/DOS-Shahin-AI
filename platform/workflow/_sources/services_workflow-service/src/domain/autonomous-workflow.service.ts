import { safeQuery, tenantSchema } from '@dos/db';
import { recordAudit } from '../adapters/audit.adapter';

const TENANT_ID_RE = /^[a-zA-Z0-9_-]+$/;

export interface AIStepExecution {
  executionId: string;
  workflowExecutionId: string;
  stepId: string;
  agentId: string;
  agentUserId: string;
  triggerReason: string;
  inputContext: Record<string, unknown>;
  outputResult: Record<string, unknown>;
  confidence: number;
  status: string;
  humanReviewed: boolean;
  reviewDecision: string | null;
  createdAt: string;
  reviewedAt: string | null;
}

function mapRowToExecution(row: Record<string, unknown>): AIStepExecution {
  return {
    executionId: row['execution_id'] as string,
    workflowExecutionId: row['workflow_execution_id'] as string,
    stepId: row['step_id'] as string,
    agentId: row['agent_id'] as string,
    agentUserId: row['agent_user_id'] as string,
    triggerReason: row['trigger_reason'] as string,
    inputContext: (row['input_context'] as Record<string, unknown>) || {},
    outputResult: (row['output_result'] as Record<string, unknown>) || {},
    confidence: parseFloat((row['confidence'] as string) || '0'),
    status: row['status'] as string,
    humanReviewed: Boolean(row['human_reviewed']),
    reviewDecision: (row['review_decision'] as string) || null,
    createdAt: row['created_at'] as string,
    reviewedAt: (row['reviewed_at'] as string) || null,
  };
}

export async function getAIQueue(
  tenantId: string,
  userId?: string,
): Promise<{ items: AIStepExecution[]; count: number }> {
  if (!tenantId || !TENANT_ID_RE.test(tenantId)) {
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
    const items = result.rows.map(mapRowToExecution);
    return { items, count: items.length };
  } catch (err: unknown) {
    const msg = (err as { message?: string })?.message || '';
    if (/relation .* does not exist|schema .* does not exist/i.test(msg)) {
      return { items: [], count: 0 };
    }
    throw err;
  }
}

export async function reviewAIStep(
  tenantId: string,
  executionId: string,
  decision: 'accepted' | 'rejected' | 'modified',
  reviewedBy: string,
): Promise<{ reviewed: true; decision: string }> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".ai_step_executions
     SET human_reviewed = TRUE, review_decision = $1, reviewed_by = $2, reviewed_at = NOW(),
         status = CASE WHEN $1 = 'rejected' THEN 'failed' ELSE 'completed' END
     WHERE execution_id = $3`,
    [decision, reviewedBy, executionId],
  );

  await recordAudit({
    tenantId,
    userId: reviewedBy,
    module: 'autonomous_workflow',
    action: 'update',
    entityType: 'ai_step_execution',
    entityId: executionId,
    afterState: { decision, reviewedBy },
  });

  return { reviewed: true, decision };
}
