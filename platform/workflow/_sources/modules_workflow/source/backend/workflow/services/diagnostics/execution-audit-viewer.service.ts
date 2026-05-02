import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { logger } from '../../ports/logger.port';
import { toErrorMessage } from '@dos/module-sdk';
import { NotFoundError } from '../../../../errors/index';
import type {
  ExecutionHistoryEntry,
  ExecutionHistoryContract,
} from '../../contracts/workflow.contracts';
import type { GenericRow } from '@dos/types';

export async function getExecutionHistory(
  tenantId: string,
  instanceId: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<ExecutionHistoryContract> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(500, Math.max(1, opts.limit ?? 100));
  const offset = Math.max(0, opts.offset ?? 0);

  const execResult = await safeQuery(
    `SELECT we.execution_id, we.workflow_id, wd.code AS definition_code, we.status
     FROM "${schema}".workflow_executions we
     JOIN "${schema}".workflow_definitions wd ON wd.definition_id = we.workflow_id
     WHERE we.execution_id = $1 AND we.deleted_at IS NULL`,
    [instanceId],
  );

  const exec = getFirstRow(execResult)!;
  if (!exec) throw new NotFoundError('workflow_execution', instanceId);

  const [eventsResult, countResult] = await Promise.all([
    safeQuery(
      `SELECT
         we.event_id,
         we.instance_id,
         we.event_type,
         we.step_id,
         ws.step_code,
         we.triggered_by,
         (we.payload->>'previousState')::text AS previous_state,
         (we.payload->>'newState')::text AS new_state,
         we.payload,
         we.created_at AS occurred_at
       FROM "${schema}".workflow_events we
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = we.step_id
       WHERE we.instance_id = $1
       ORDER BY we.created_at ASC
       LIMIT $2 OFFSET $3`,
      [instanceId, limit, offset],
    ),
    safeQuery(
      `SELECT COUNT(*)::int AS total
       FROM "${schema}".workflow_events
       WHERE instance_id = $1`,
      [instanceId],
    ),
  ]);

  const entries: ExecutionHistoryEntry[] = eventsResult.rows.map((r: GenericRow) => ({
    instanceId: r.instance_id,
    eventType: r.event_type ?? '',
    stepId: r.step_id ?? null,
    stepCode: r.step_code ?? null,
    triggeredBy: r.triggered_by ?? 'system',
    previousState: r.previous_state ?? null,
    newState: r.new_state ?? null,
    payload: r.payload ?? null,
    occurredAt: r.occurred_at?.toISOString?.() ?? r.occurred_at ?? '',
  }));

  return {
    instanceId,
    definitionId: exec.workflow_id,
    definitionCode: exec.definition_code ?? '',
    status: exec.status,
    entries,
    totalEntries: getFirstRow(countResult)?.total ?? entries.length,
  };
}

export async function getAuditTrailForExecution(
  tenantId: string,
  instanceId: string,
  limit: number = 100,
): Promise<AuditTrailEntry[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         at.audit_id,
         at.user_id,
         at.module,
         at.action,
         at.entity_type,
         at.entity_id,
         at.before_state,
         at.after_state,
         at.ip_address,
         at.created_at
       FROM "${schema}".audit_trail at
       WHERE at.module = 'workflow'
         AND (at.entity_id = $1
              OR at.after_state->>'instanceId' = $1
              OR at.after_state->>'executionId' = $1)
         AND at.deleted_at IS NULL
       ORDER BY at.created_at ASC
       LIMIT $2`,
      [instanceId, limit],
    );

    return result.rows.map((r: GenericRow) => ({
      auditId: r.audit_id,
      userId: r.user_id,
      module: r.module,
      action: r.action,
      entityType: r.entity_type,
      entityId: r.entity_id,
      beforeState: r.before_state,
      afterState: r.after_state,
      ipAddress: r.ip_address ?? null,
      occurredAt: r.created_at?.toISOString?.() ?? r.created_at ?? '',
    }));
  } catch (err) {
    logger.warn('[ExecutionAuditViewer] getAuditTrailForExecution failed', {
      instanceId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function getApprovalAuditForExecution(
  tenantId: string,
  instanceId: string,
): Promise<ApprovalAuditEntry[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         wa.approval_id,
         wa.execution_id,
         wa.step_id,
         ws.step_code,
         wa.approver_id,
         wa.status,
         wa.decision_comment,
         wa.decided_at,
         wa.escalated_to,
         wa.sla_deadline,
         wa.created_at
       FROM "${schema}".workflow_approvals wa
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = wa.step_id
       WHERE wa.execution_id = $1
         AND wa.deleted_at IS NULL
       ORDER BY wa.created_at ASC`,
      [instanceId],
    );

    return result.rows.map((r: GenericRow) => ({
      approvalId: r.approval_id,
      executionId: r.execution_id,
      stepId: r.step_id,
      stepCode: r.step_code ?? null,
      approverId: r.approver_id,
      status: r.status,
      decisionComment: r.decision_comment ?? null,
      decidedAt: r.decided_at?.toISOString?.() ?? r.decided_at ?? null,
      escalatedTo: r.escalated_to ?? null,
      slaDeadline: r.sla_deadline?.toISOString?.() ?? r.sla_deadline ?? null,
      createdAt: r.created_at?.toISOString?.() ?? r.created_at ?? '',
    }));
  } catch (err) {
    logger.warn('[ExecutionAuditViewer] getApprovalAuditForExecution failed', {
      instanceId, error: toErrorMessage(err),
    });
    return [];
  }
}

export async function getTransitionAuditForExecution(
  tenantId: string,
  instanceId: string,
): Promise<TransitionAuditEntry[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         we.event_id,
         we.instance_id,
         we.event_type,
         we.step_id,
         ws.step_code,
         we.triggered_by,
         we.payload,
         we.created_at
       FROM "${schema}".workflow_events we
       LEFT JOIN "${schema}".workflow_steps ws ON ws.step_id = we.step_id
       WHERE we.instance_id = $1
         AND we.event_type IN ('step_transitioned', 'step_completed', 'step_failed',
                               'transition_denied', 'transition_blocked',
                               'auto_recovered', 'recovery_failed')
       ORDER BY we.created_at ASC`,
      [instanceId],
    );

    return result.rows.map((r: GenericRow) => ({
      eventId: r.event_id,
      instanceId: r.instance_id,
      eventType: r.event_type,
      stepId: r.step_id ?? null,
      stepCode: r.step_code ?? null,
      triggeredBy: r.triggered_by ?? 'system',
      fromStepId: r.payload?.from ?? null,
      toStepId: r.payload?.to ?? null,
      outcome: r.payload?.outcome ?? null,
      occurredAt: r.created_at?.toISOString?.() ?? r.created_at ?? '',
    }));
  } catch (err) {
    logger.warn('[ExecutionAuditViewer] getTransitionAuditForExecution failed', {
      instanceId, error: toErrorMessage(err),
    });
    return [];
  }
}

export interface AuditTrailEntry {
  auditId: string;
  userId: string;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  ipAddress: string | null;
  occurredAt: string;
}

export interface ApprovalAuditEntry {
  approvalId: string;
  executionId: string;
  stepId: string;
  stepCode: string | null;
  approverId: string;
  status: string;
  decisionComment: string | null;
  decidedAt: string | null;
  escalatedTo: string | null;
  slaDeadline: string | null;
  createdAt: string;
}

export interface TransitionAuditEntry {
  eventId: string;
  instanceId: string;
  eventType: string;
  stepId: string | null;
  stepCode: string | null;
  triggeredBy: string;
  fromStepId: string | null;
  toStepId: string | null;
  outcome: string | null;
  occurredAt: string;
}
