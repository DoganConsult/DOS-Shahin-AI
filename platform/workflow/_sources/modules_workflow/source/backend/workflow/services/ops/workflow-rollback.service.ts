import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { emitWorkflowEvent } from '../../ports/lifecycle.port';
import { logger } from '../../ports/logger.port';

export type RollbackStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface RollbackLogEntry {
  rollback_id: string;
  instance_id: string;
  step_id: string | null;
  original_action_id: string | null;
  original_action_type: string;
  original_state: Record<string, unknown>;
  compensating_action_type: string | null;
  compensating_state: Record<string, unknown>;
  rollback_reason: string;
  rollback_status: RollbackStatus;
  initiated_by: string;
  completed_at: string | null;
  created_at: string;
}

const COMPENSATION_REGISTRY: Record<string, string> = {
  'task_create': 'task_cancel',
  'task_assign': 'task_unassign',
  'entity_update': 'entity_revert',
  'approval_auto': 'approval_revoke',
  'notification_send': 'notification_retract',
  'escalation_trigger': 'escalation_cancel',
  'status_change': 'status_revert',
  'risk_score_auto': 'risk_score_revert',
  'risk_treatment_auto': 'risk_treatment_revert',
  'compliance_test_auto': 'compliance_test_revert',
  'compliance_gap_auto': 'compliance_gap_revert',
  'evidence_auto_validate': 'evidence_invalidate',
  'evidence_auto_collect': 'evidence_uncollect',
  'policy_auto_draft': 'policy_draft_discard',
  'policy_section_auto': 'policy_section_revert',
  'audit_finding_auto': 'audit_finding_revert',
  'incident_auto_triage': 'incident_retriage',
  'incident_auto_contain': 'incident_uncontain',
  'exception_auto_review': 'exception_review_revert',
  'vendor_auto_score': 'vendor_score_revert',
  'vendor_auto_assess': 'vendor_assess_revert',
  'bcp_auto_assess': 'bcp_assess_revert',
  'asset_auto_classify': 'asset_classify_revert',
  'remediation_auto_plan': 'remediation_plan_revert',
  'remediation_auto_verify': 'remediation_verify_revert',
  'action_auto_assign': 'action_unassign',
  'action_auto_complete': 'action_uncomplete',
  'training_auto_assign': 'training_unassign',
  'training_auto_assess': 'training_assess_revert',
  'qiyas_auto_score': 'qiyas_score_revert',
  'ai_gov_auto_assess': 'ai_gov_assess_revert',
};

export function getCompensatingAction(originalAction: string): string | null {
  return Object.hasOwn(COMPENSATION_REGISTRY, originalAction) ? COMPENSATION_REGISTRY[originalAction] : null;
}

export async function initiateRollback(
  tenantId: string,
  userId: string,
  input: {
    instanceId: string;
    stepId?: string;
    originalActionId?: string;
    originalActionType: string;
    originalState: Record<string, unknown>;
    reason: string;
  },
): Promise<RollbackLogEntry> {
  const schema = tenantSchema(tenantId);
  const compensating = getCompensatingAction(input.originalActionType);

  const result = await safeQuery(
    `INSERT INTO "${schema}".workflow_rollback_log
       (instance_id, step_id, original_action_id, original_action_type,
        original_state, compensating_action_type, rollback_reason, initiated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      input.instanceId,
      input.stepId || null,
      input.originalActionId || null,
      input.originalActionType,
      JSON.stringify(input.originalState),
      compensating,
      input.reason,
      userId,
    ],
  );

  const row = getFirstRow(result)!;

  await recordAudit({
    tenantId,
    userId,
    module: 'workflow',
    action: 'create',
    entityType: 'workflow_rollback',
    entityId: row.rollback_id,
    afterState: { instanceId: input.instanceId, originalActionType: input.originalActionType, reason: input.reason },
  });

  await (emitWorkflowEvent as any)({
    tenantId,
    instanceId: input.instanceId,
    eventType: 'reassigned',
    stepId: input.stepId,
    triggeredBy: userId,
    payload: { rollbackId: row.rollback_id, reason: input.reason },
    previousState: 'ai_executed',
    newState: 'rollback_pending',
  }).catch((err: unknown) => {
    logger.warn(`[Rollback] Failed to emit event: ${err instanceof Error ? err.message : String(err)}`);
  });

  return mapRow(row);
}

export async function executeRollback(
  tenantId: string,
  rollbackId: string,
  userId: string,
  compensatingState: Record<string, unknown>,
): Promise<RollbackLogEntry | null> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".workflow_rollback_log
     SET rollback_status = 'in_progress' WHERE rollback_id = $1 AND rollback_status = 'pending'`,
    [rollbackId],
  );

  try {
    const result = await safeQuery(
      `UPDATE "${schema}".workflow_rollback_log
       SET rollback_status = 'completed', compensating_state = $1, completed_at = NOW()
       WHERE rollback_id = $2
       RETURNING *`,
      [JSON.stringify(compensatingState), rollbackId],
    );
    if (result.rows.length === 0) return null;

    await recordAudit({
      tenantId,
      userId,
      module: 'workflow',
      action: 'update',
      entityType: 'workflow_rollback',
      entityId: rollbackId,
      afterState: { rollback_status: 'completed' },
    });

    return mapRow(getFirstRow(result));
  } catch (err: unknown) {
    await safeQuery(
      `UPDATE "${schema}".workflow_rollback_log
       SET rollback_status = 'failed', compensating_state = $1
       WHERE rollback_id = $2`,
      [JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), rollbackId],
    );
    throw err;
  }
}

export async function getRollbacksByInstance(
  tenantId: string,
  instanceId: string,
): Promise<RollbackLogEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_rollback_log
     WHERE instance_id = $1 ORDER BY created_at DESC`,
    [instanceId],
  );
  return result.rows.map(mapRow);
}

export async function getPendingRollbacks(
  tenantId: string,
  limit = 50,
): Promise<RollbackLogEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".workflow_rollback_log
     WHERE rollback_status IN ('pending','in_progress')
     ORDER BY created_at ASC LIMIT $1`,
    [limit],
  );
  return result.rows.map(mapRow);
}

function mapRow(row: Record<string, unknown>): RollbackLogEntry {
  return {

    rollback_id: row.rollback_id,

    instance_id: row.instance_id,

    step_id: row.step_id || null,

    original_action_id: row.original_action_id || null,

    original_action_type: row.original_action_type,
    original_state: typeof row.original_state === 'string' ? JSON.parse(row.original_state) : (row.original_state || {}),

    compensating_action_type: row.compensating_action_type || null,
    compensating_state: typeof row.compensating_state === 'string' ? JSON.parse(row.compensating_state) : (row.compensating_state || {}),

    rollback_reason: row.rollback_reason,

    rollback_status: row.rollback_status || 'pending',

    initiated_by: row.initiated_by,

    completed_at: row.completed_at || null,

    created_at: row.created_at,
  };
}
