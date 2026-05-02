/**
 * Action Due-Date Service
 * Manages due dates, extensions, overdue detection, and upcoming deadline queries.
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

export interface UpcomingDeadlineEntry {
  actionId: string;
  title: string;
  deadline: string;
  assignedTo: string | null;
  status: string;
  criticality: string;
  hoursRemaining: number;
}

export interface OverdueEntry {
  actionId: string;
  title: string;
  deadline: string;
  assignedTo: string | null;
  status: string;
  criticality: string;
  daysOverdue: number;
}

// ---------------------------------------------------------------------------
// Set due date
// ---------------------------------------------------------------------------

/** Set or update the deadline for an action item. */
export async function setDueDate(
  tenantId: string,
  actionId: string,
  deadline: string,
  updatedBy: string,
): Promise<{ actionId: string; deadline: string }> {
  const schema = tenantSchema(tenantId);

  const parsed = new Date(deadline);
  if (isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid deadline date'), { statusCode: 400 });
  }

  const current = await safeQuery(
    `SELECT deadline FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );
  if (current.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const previousDeadline: string | null = current.rows[0].deadline ?? null;

  await safeQuery(
    `UPDATE "${schema}".action_items
     SET deadline = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`,
    [deadline, updatedBy, actionId],
  );

  recordAudit({
    tenantId,
    userId: updatedBy,
    module: 'action',
    action: 'update',
    entityType: 'action_item',
    entityId: actionId,
    beforeState: { deadline: previousDeadline },
    afterState: { deadline },
  }).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Due date set', { actionId, deadline, updatedBy });
  return { actionId, deadline };
}

// ---------------------------------------------------------------------------
// Extend due date
// ---------------------------------------------------------------------------

/** Extend the deadline for an action item. New date must be after current deadline. */
export async function extendDueDate(
  tenantId: string,
  actionId: string,
  newDeadline: string,
  extendedBy: string,
  reason: string,
): Promise<{ actionId: string; previousDeadline: string | null; newDeadline: string }> {
  const schema = tenantSchema(tenantId);

  const parsed = new Date(newDeadline);
  if (isNaN(parsed.getTime())) {
    throw Object.assign(new Error('Invalid deadline date'), { statusCode: 400 });
  }

  const current = await safeQuery(
    `SELECT deadline FROM "${schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`,
    [actionId],
  );
  if (current.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const previousDeadline: string | null = current.rows[0].deadline ?? null;

  if (previousDeadline && new Date(newDeadline) <= new Date(previousDeadline)) {
    throw Object.assign(
      new Error('New deadline must be after the current deadline'),
      { statusCode: 400 },
    );
  }

  await safeQuery(
    `UPDATE "${schema}".action_items
     SET deadline = $1, updated_at = NOW(), updated_by = $2
     WHERE action_id = $3`,
    [newDeadline, extendedBy, actionId],
  );

  recordAudit({
    tenantId,
    userId: extendedBy,
    module: 'action',
    action: 'update',
    entityType: 'action_item',
    entityId: actionId,
    beforeState: { deadline: previousDeadline },
    afterState: { deadline: newDeadline, extensionReason: reason },
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.updated',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, previousDeadline, newDeadline, extendedBy, reason },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Due date extended', { actionId, previousDeadline, newDeadline, extendedBy, reason });
  return { actionId, previousDeadline, newDeadline };
}

// ---------------------------------------------------------------------------
// Check overdue
// ---------------------------------------------------------------------------

/** Find all action items that are past their deadline and not yet in a terminal state. */
export async function checkOverdue(
  tenantId: string,
): Promise<OverdueEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT action_id, title, deadline, assigned_to, status, criticality
     FROM "${schema}".action_items
     WHERE deleted_at IS NULL
       AND status NOT IN ('closed', 'cancelled', 'verified', 'overdue', 'escalated')
       AND deadline IS NOT NULL
       AND deadline < NOW()
     ORDER BY deadline ASC`,
    [],
  );

  return result.rows.map((row: Record<string, unknown>) => {
    const deadlineDate = new Date(row.deadline as string);
    const now = new Date();
    const daysOverdue = Math.floor((now.getTime() - deadlineDate.getTime()) / (1000 * 60 * 60 * 24));

    return {
      actionId: row.action_id as string,
      title: row.title as string,
      deadline: row.deadline as string,
      assignedTo: (row.assigned_to as string) ?? null,
      status: row.status as string,
      criticality: row.criticality as string,
      daysOverdue,
    };
  });
}

// ---------------------------------------------------------------------------
// Upcoming deadlines
// ---------------------------------------------------------------------------

/** Get action items with deadlines within the specified number of days. */
export async function getUpcomingDeadlines(
  tenantId: string,
  withinDays: number,
): Promise<UpcomingDeadlineEntry[]> {
  const schema = tenantSchema(tenantId);

  if (withinDays < 0) {
    throw Object.assign(new Error('withinDays must be non-negative'), { statusCode: 400 });
  }

  const result = await safeQuery(
    `SELECT action_id, title, deadline, assigned_to, status, criticality
     FROM "${schema}".action_items
     WHERE deleted_at IS NULL
       AND status NOT IN ('closed', 'cancelled', 'verified', 'completed')
       AND deadline IS NOT NULL
       AND deadline BETWEEN NOW() AND NOW() + ($1 || ' days')::INTERVAL
     ORDER BY deadline ASC`,
    [withinDays],
  );

  return result.rows.map((row: Record<string, unknown>) => {
    const deadlineDate = new Date(row.deadline as string);
    const now = new Date();
    const hoursRemaining = Math.max(0, Math.floor((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60)));

    return {
      actionId: row.action_id as string,
      title: row.title as string,
      deadline: row.deadline as string,
      assignedTo: (row.assigned_to as string) ?? null,
      status: row.status as string,
      criticality: row.criticality as string,
      hoursRemaining,
    };
  });
}
