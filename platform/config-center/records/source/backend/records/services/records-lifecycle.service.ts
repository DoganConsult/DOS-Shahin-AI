import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { randomUUID } from 'crypto';
import { emitRecordsEvent } from './records-event.service';
import type { RecordsStatus } from '../types/records.types';

type LifecycleTransition = {
  from: RecordsStatus[];
  to: RecordsStatus;
  requiresApproval: boolean;
  requiresWorkflow: boolean;
};

const ALLOWED_TRANSITIONS: Record<string, LifecycleTransition> = {
  activate: {
    from: ['active'],
    to: 'active',
    requiresApproval: false,
    requiresWorkflow: false,
  },
  start_retention: {
    from: ['active'],
    to: 'retention',
    requiresApproval: false,
    requiresWorkflow: false,
  },
  start_review: {
    from: ['active', 'retention'],
    to: 'review',
    requiresApproval: false,
    requiresWorkflow: true,
  },
  place_hold: {
    from: ['active', 'retention', 'review'],
    to: 'hold',
    requiresApproval: false,
    requiresWorkflow: false,
  },
  release_hold: {
    from: ['hold'],
    to: 'active',
    requiresApproval: false,
    requiresWorkflow: false,
  },
  schedule_disposal: {
    from: ['retention', 'review'],
    to: 'disposal_pending',
    requiresApproval: true,
    requiresWorkflow: true,
  },
  execute_disposal: {
    from: ['disposal_pending'],
    to: 'disposed',
    requiresApproval: true,
    requiresWorkflow: true,
  },
  archive: {
    from: ['active', 'retention', 'review', 'disposed'],
    to: 'archived',
    requiresApproval: false,
    requiresWorkflow: false,
  },
};

export interface LifecycleTransitionResult {
  recordId: string;
  previousStatus: RecordsStatus;
  newStatus: RecordsStatus;
  transitionedAt: string;
  transitionedBy: string;
  workflowInstanceId: string | null;
  requiresApproval: boolean;
}

export interface LifecycleHistoryEntry {
  historyId: string;
  recordId: string;
  previousStatus: RecordsStatus | null;
  newStatus: RecordsStatus;
  action: string;
  transitionedBy: string;
  reason: string | null;
  workflowInstanceId: string | null;
  transitionedAt: string;
}

export async function transitionStatus(
  tenantId: string,
  recordId: string,
  action: string,
  actorId: string,
  reason?: string,
  workflowInstanceId?: string,
): Promise<LifecycleTransitionResult> {
  const schema = tenantSchema(tenantId);
  const rule = ALLOWED_TRANSITIONS[action];
  if (!rule) {
    throw new Error(`Unknown lifecycle action: ${action}`);
  }

  const current = await safeQuery(
    `SELECT status FROM "${schema}".records_items WHERE record_id = $1 LIMIT 1`,
    [recordId],
  ).catch(() => ({ rows: [] as any[] }));
  const previousStatus = (current.rows[0]?.status as RecordsStatus | undefined) ?? rule.from[0];

  const newStatus = rule.to;
  try {
    await safeQuery(
      `UPDATE "${schema}".records_items SET status = $2, updated_at = NOW() WHERE record_id = $1`,
      [recordId, newStatus],
    );
  } catch { /* table absent */ }

  const transitionedAt = new Date().toISOString();
  try {
    await safeQuery(
      `INSERT INTO "${schema}".record_lifecycle_history
        (history_id, record_id, previous_status, new_status, action, transitioned_by, reason, workflow_instance_id, transitioned_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        randomUUID(),
        recordId,
        previousStatus,
        newStatus,
        action,
        actorId,
        reason ?? null,
        workflowInstanceId ?? null,
        transitionedAt,
      ],
    );
  } catch { /* table absent */ }

  try {
    emitRecordsEvent({
      tenantId,
      entityType: 'record',
      entityId: recordId,
      action: 'status_changed',
      triggeredBy: actorId,
      previousState: previousStatus,
      newState: newStatus,
      data: { lifecycleAction: action },
    });
  } catch { /* non-fatal */ }

  return {
    recordId,
    previousStatus,
    newStatus,
    transitionedAt,
    transitionedBy: actorId,
    workflowInstanceId: workflowInstanceId ?? null,
    requiresApproval: rule.requiresApproval,
  };
}

export async function getLifecycleHistory(
  tenantId: string,
  recordId: string,
  limit = 50,
  offset = 0,
): Promise<{ rows: LifecycleHistoryEntry[]; total: number }> {
  const schema = tenantSchema(tenantId);

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".record_lifecycle_history WHERE record_id = $1`,
    [recordId],
  );
  const total = getFirstRow(countResult)?.total ?? 0;

  const dataResult = await safeQuery(
    `SELECT history_id, record_id, previous_status, new_status, action, transitioned_by, reason, workflow_instance_id, transitioned_at
     FROM "${schema}".record_lifecycle_history
     WHERE record_id = $1
     ORDER BY transitioned_at DESC
     LIMIT $2 OFFSET $3`,
    [recordId, limit, offset],
  );

  const rows: LifecycleHistoryEntry[] = (dataResult.rows ?? []).map((r: Record<string, unknown>) => ({
    historyId: r.history_id as string,
    recordId: r.record_id as string,
    previousStatus: r.previous_status as RecordsStatus | null,
    newStatus: r.new_status as RecordsStatus,
    action: r.action as string,
    transitionedBy: r.transitioned_by as string,
    reason: r.reason as string | null,
    workflowInstanceId: r.workflow_instance_id as string | null,
    transitionedAt: r.transitioned_at as string,
  }));

  return { rows, total };
}

export function getAllowedTransitions(currentStatus: RecordsStatus): string[] {
  return Object.entries(ALLOWED_TRANSITIONS)
    .filter(([, rule]) => rule.from.includes(currentStatus))
    .map(([action]) => action);
}

export function doesTransitionRequireApproval(action: string): boolean {
  return ALLOWED_TRANSITIONS[action]?.requiresApproval ?? false;
}

export function doesTransitionRequireWorkflow(action: string): boolean {
  return ALLOWED_TRANSITIONS[action]?.requiresWorkflow ?? false;
}
