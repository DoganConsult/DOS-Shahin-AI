/**
 * Action Assignment Service
 * Manages assignment and reassignment of action items with full history.
 * @owner Module:action
 */
import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { recordAudit } from '../ports/audit.port';
import { emitEvent } from '../ports/events.port';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AssignmentHistoryEntry {
  assignmentId: string;
  actionId: string;
  previousAssignee: string | null;
  newAssignee: string;
  assignedBy: string;
  reason: string | null;
  assignedAt: string;
}

export interface AssigneeWorkloadEntry {
  assigneeId: string;
  openCount: number;
  inProgressCount: number;
  overdueCount: number;
  totalActive: number;
}

// ---------------------------------------------------------------------------
// Assign
// ---------------------------------------------------------------------------

/** Assign an action item to a user. */
export async function assignAction(
  tenantId: string,
  actionId: string,
  assigneeId: string,
  assignedBy: string,
): Promise<{ actionId: string; assigneeId: string }> {
  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT assigned_to FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );
  if (current.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const previousAssignee: string | null = current.rows[0].assigned_to ?? null;

  await safeQuery(
    `UPDATE "${schema}".action_items
     SET assigned_to = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`,
    [assigneeId, assignedBy, actionId],
  );

  await safeQuery(
    `INSERT INTO "${schema}".action_assignment_history
       (action_id, previous_assignee, new_assignee, assigned_by, reason, assigned_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [actionId, previousAssignee, assigneeId, assignedBy, 'Initial assignment'],
  ).catch(catchHandler(EC.EVENT_BUS));

  recordAudit({
    tenantId,
    userId: assignedBy,
    module: 'action',
    action: 'update',
    entityType: 'action_item',
    entityId: actionId,
    beforeState: { assigned_to: previousAssignee },
    afterState: { assigned_to: assigneeId },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.assigned',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, assigneeId, assignedBy, previousAssignee },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Action item assigned', { actionId, assigneeId, assignedBy });
  return { actionId, assigneeId };
}

// ---------------------------------------------------------------------------
// Reassign
// ---------------------------------------------------------------------------

/** Reassign an action item to a different user. Validates not same user. */
export async function reassignAction(
  tenantId: string,
  actionId: string,
  newAssigneeId: string,
  reassignedBy: string,
  reason: string,
): Promise<{ actionId: string; newAssigneeId: string; previousAssigneeId: string | null }> {
  const schema = tenantSchema(tenantId);

  const current = await safeQuery(
    `SELECT assigned_to FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );
  if (current.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const previousAssigneeId: string | null = current.rows[0].assigned_to ?? null;

  if (previousAssigneeId === newAssigneeId) {
    throw Object.assign(
      new Error('Cannot reassign to the same user'),
      { statusCode: 400 },
    );
  }

  await safeQuery(
    `UPDATE "${schema}".action_items
     SET assigned_to = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`,
    [newAssigneeId, reassignedBy, actionId],
  );

  await safeQuery(
    `INSERT INTO "${schema}".action_assignment_history
       (action_id, previous_assignee, new_assignee, assigned_by, reason, assigned_at)
     VALUES ($1, $2, $3, $4, $5, NOW())`,
    [actionId, previousAssigneeId, newAssigneeId, reassignedBy, reason],
  ).catch(catchHandler(EC.EVENT_BUS));

  recordAudit({
    tenantId,
    userId: reassignedBy,
    module: 'action',
    action: 'update',
    entityType: 'action_item',
    entityId: actionId,
    beforeState: { assigned_to: previousAssigneeId },
    afterState: { assigned_to: newAssigneeId },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.reassigned',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, newAssigneeId, previousAssigneeId, reassignedBy, reason },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Action item reassigned', { actionId, newAssigneeId, reassignedBy, reason });
  return { actionId, newAssigneeId, previousAssigneeId };
}

// ---------------------------------------------------------------------------
// History
// ---------------------------------------------------------------------------

/** Get full assignment history for an action item. */
export async function getAssignmentHistory(
  tenantId: string,
  actionId: string,
): Promise<AssignmentHistoryEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       id AS "assignmentId",
       action_id AS "actionId",
       previous_assignee AS "previousAssignee",
       new_assignee AS "newAssignee",
       assigned_by AS "assignedBy",
       reason,
       assigned_at AS "assignedAt"
     FROM "${schema}".action_assignment_history
     WHERE action_id = $1
     ORDER BY assigned_at ASC`,
    [actionId],
  );

  return result.rows;
}

// ---------------------------------------------------------------------------
// Workload
// ---------------------------------------------------------------------------

/** Get workload counts per assignee across all active action items. */
export async function getAssigneeWorkload(
  tenantId: string,
): Promise<AssigneeWorkloadEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT
       assigned_to AS "assigneeId",
       COUNT(*) FILTER (WHERE status = 'open')::int AS "openCount",
       COUNT(*) FILTER (WHERE status = 'in_progress')::int AS "inProgressCount",
       COUNT(*) FILTER (WHERE status = 'overdue')::int AS "overdueCount",
       COUNT(*)::int AS "totalActive"
     FROM "${schema}".action_items
     WHERE deleted_at IS NULL
       AND assigned_to IS NOT NULL
       AND status NOT IN ('closed', 'cancelled', 'verified')
     GROUP BY assigned_to
     ORDER BY "totalActive" DESC`,
    [],
  );

  return result.rows;
}
