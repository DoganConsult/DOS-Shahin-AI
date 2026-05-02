/**
 * Action Item Lifecycle Service
 * Manages state transitions for action items with full audit trail.
 * Uses the canonical ACTION_ITEM_TRANSITIONS from lifecycle-registration.
 * @owner Module:action
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { ACTION_ITEM_TRANSITIONS } from '../lifecycle-registration';
import { recordAudit } from '../ports/audit.port';
import { evaluateLifecycleTransition } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';

// ---------------------------------------------------------------------------
// Core transition
// ---------------------------------------------------------------------------

/** Transition an action item to a new status with validation and audit. */
export async function transitionStatus(
  tenantId: string,
  actionId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT status FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );
  if (current.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const fromStatus: string = current.rows[0].status;
  const allowed = ACTION_ITEM_TRANSITIONS[fromStatus] ?? [];
  if (!allowed.includes(targetStatus)) {
    throw Object.assign(
      new Error(`Cannot transition from ${fromStatus} to ${targetStatus}`),
      { statusCode: 400 },
    );
  }

  await safeQuery(
    `UPDATE "${schema}".action_items
     SET status = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`,
    [targetStatus, userId, actionId],
  );

  await safeQuery(
    `INSERT INTO "${schema}".action_status_history
       (action_id, from_status, to_status, changed_by, reason, changed_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [actionId, fromStatus, targetStatus, userId, reason ?? null],
  ).catch(catchHandler(EC.EVENT_BUS));

  recordAudit({
    tenantId,
    userId,
    module: 'action',
    action: 'update',
    entityType: 'action_item',
    entityId: actionId,
    beforeState: { status: fromStatus },
    afterState: { status: targetStatus },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.status_changed',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, fromStatus, toStatus: targetStatus, changedBy: userId, reason },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Action item transitioned', { actionId, fromStatus, toStatus: targetStatus });
  return { fromStatus, toStatus: targetStatus };
}

// ---------------------------------------------------------------------------
// Bulk transition
// ---------------------------------------------------------------------------

/** Transition multiple action items at once. */
export async function bulkTransitionStatus(
  tenantId: string,
  actionIds: string[],
  targetStatus: string,
  userId: string,
): Promise<{ succeeded: string[]; failed: Array<{ id: string; error: string }> }> {
  const succeeded: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];

  for (const id of actionIds) {
    try {
      await transitionStatus(tenantId, id, targetStatus, userId);
      succeeded.push(id);
    } catch (e) {
      failed.push({ id, error: (e as Error).message });
    }
  }

  logger.info('Bulk transition completed', { tenantId, targetStatus, succeeded: succeeded.length, failed: failed.length });
  return { succeeded, failed };
}

// ---------------------------------------------------------------------------
// Status history
// ---------------------------------------------------------------------------

/** Get status transition history for an action item. */
export async function getStatusHistory(
  tenantId: string,
  actionId: string,
): Promise<Array<{ fromStatus: string; toStatus: string; changedBy: string; reason: string | null; changedAt: string }>> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT from_status AS "fromStatus", to_status AS "toStatus",
            changed_by AS "changedBy", reason, changed_at AS "changedAt"
     FROM "${schema}".action_status_history
     WHERE action_id = $1
     ORDER BY changed_at ASC`,
    [actionId],
  );

  return result.rows;
}

// ---------------------------------------------------------------------------
// Convenience transitions
// ---------------------------------------------------------------------------

/** Cancel an action item. */
export async function cancelItem(
  tenantId: string,
  actionId: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  return transitionStatus(tenantId, actionId, 'cancelled', userId, reason ?? 'Cancelled by user');
}

/** Reopen a completed or cancelled action item. */
export async function reopenItem(
  tenantId: string,
  actionId: string,
  userId: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  return transitionStatus(tenantId, actionId, 'open', userId, 'Reopened');
}

/** Submit an action item for completion review. */
export async function submitCompletion(
  tenantId: string,
  actionId: string,
  userId: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);

  const result = await transitionStatus(tenantId, actionId, 'completed', userId, 'Completion submitted');

  await safeQuery(
    `UPDATE "${schema}".action_items
     SET completed_by = $1, completed_at = NOW()
     WHERE action_id = $2`,
    [userId, actionId],
  ).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.completed',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, completedBy: userId },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  return result;
}

/** Verify a completed action item. Requires DAuth lifecycle evaluation. */
export async function verifyAction(
  tenantId: string,
  actionId: string,
  verifiedBy: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const schema = tenantSchema(tenantId);

  await evaluateLifecycleTransition(tenantId, verifiedBy, {
    moduleCode: 'action',
    entityType: 'action_item',
    entityId: actionId,
    fromState: 'completed',
    toState: 'verified',
    permissionCode: 'action.item.verify',
    userRoles: [],
  });

  const result = await transitionStatus(tenantId, actionId, 'verified', verifiedBy, 'Verified');

  await safeQuery(
    `UPDATE "${schema}".action_items
     SET verified_by = $1, verified_at = NOW()
     WHERE action_id = $2`,
    [verifiedBy, actionId],
  ).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.verified',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, verifiedBy },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  return result;
}

/** Close a verified action item. */
export async function closeAction(
  tenantId: string,
  actionId: string,
  userId: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  await evaluateLifecycleTransition(tenantId, userId, {
    moduleCode: 'action',
    entityType: 'action_item',
    entityId: actionId,
    fromState: 'verified',
    toState: 'closed',
    permissionCode: 'action.item.close',
    userRoles: [],
  });

  return transitionStatus(tenantId, actionId, 'closed', userId, 'Closed after verification');
}

/** Mark an action item as overdue. */
export async function markOverdue(
  tenantId: string,
  actionId: string,
  systemUserId: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const result = await transitionStatus(tenantId, actionId, 'overdue', systemUserId, 'Deadline exceeded');

  emitEvent({
    eventType: 'action.action_item.overdue_detected',
    tenantId,
    sourceService: 'action',
    severity: 'critical',
    payload: { actionId, detectedBy: systemUserId },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  return result;
}

/** Escalate an overdue action item. */
export async function escalateAction(
  tenantId: string,
  actionId: string,
  escalatedBy: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string }> {
  const result = await transitionStatus(tenantId, actionId, 'escalated', escalatedBy, reason ?? 'Escalated');

  emitEvent({
    eventType: 'action.action_item.escalated',
    tenantId,
    sourceService: 'action',
    severity: 'warning',
    payload: { actionId, escalatedBy, reason },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  return result;
}
