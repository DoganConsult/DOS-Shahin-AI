/**
 * Action Item Core CRUD Service
 * Provides read/write operations for action_items table.
 * @owner Module:action
 */
import { randomUUID } from 'crypto';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { logger } from '../ports/logger.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import { recordAudit } from '../ports/audit.port';
import { emitEvent } from '../ports/events.port';

// ---------------------------------------------------------------------------
// Return type
// ---------------------------------------------------------------------------

export interface ActionItemRecord {
  actionId: string;
  tenantId: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  source: string;
  sourceId: string;
  assignedToId: string | null;
  ownerId: string | null;
  dueDate: string | null;
  completedAt: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  progressPercent: number;
  isOverdue: boolean;
  linkedModuleCode: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Row mapper
// ---------------------------------------------------------------------------

function mapRow(row: Record<string, unknown>, tenantId: string): ActionItemRecord {
  const deadline = row.deadline as string | null;
  const targetDate = row.target_date as string | null;
  const dueDate = deadline ?? targetDate ?? null;
  const status = row.status as string;
  const isOverdue =
    status !== 'closed' &&
    status !== 'cancelled' &&
    status !== 'verified' &&
    dueDate !== null &&
    new Date(dueDate) < new Date();

  return {
    actionId: row.action_id as string,
    tenantId,
    title: row.title as string,
    description: (row.description as string) ?? null,
    status,
    priority: (row.criticality as string) ?? 'medium',
    source: (row.source_type as string) ?? 'manual',
    sourceId: (row.source_id as string) ?? '',
    assignedToId: (row.assigned_to as string) ?? null,
    ownerId: (row.owner_team_id as string) ?? null,
    dueDate,
    completedAt: (row.completed_at as string) ?? null,
    verifiedById: (row.verified_by as string) ?? null,
    verifiedAt: (row.verified_at as string) ?? null,
    progressPercent: Number(row.progress_percentage ?? 0),
    isOverdue,
    linkedModuleCode: (row.source_type as string) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

// ---------------------------------------------------------------------------
// Filters interface
// ---------------------------------------------------------------------------

export interface ActionItemFilters {
  status?: string;
  assignedTo?: string;
  sourceType?: string;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Core CRUD
// ---------------------------------------------------------------------------

/** List action items with optional filters, ordered by criticality + deadline. */
export async function getActionItems(
  tenantId: string,
  filters?: ActionItemFilters,
): Promise<{ items: ActionItemRecord[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let paramIdx = 0;

  if (filters?.status) {
    paramIdx += 1;
    conditions.push(`status = $${paramIdx}`);
    params.push(filters.status);
  }
  if (filters?.assignedTo) {
    paramIdx += 1;
    conditions.push(`assigned_to = $${paramIdx}`);
    params.push(filters.assignedTo);
  }
  if (filters?.sourceType) {
    paramIdx += 1;
    conditions.push(`source_type = $${paramIdx}`);
    params.push(filters.sourceType);
  }

  const where = conditions.join(' AND ');
  const limit = filters?.limit ?? 50;
  const offset = filters?.offset ?? 0;

  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total FROM "${schema}".action_items WHERE ${where}`,
    params,
  );
  const total: number = countResult.rows[0]?.total ?? 0;

  const dataResult = await safeQuery(
    `SELECT * FROM "${schema}".action_items
     WHERE ${where}
     ORDER BY
       CASE criticality WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
       deadline ASC NULLS LAST
     LIMIT $${paramIdx + 1} OFFSET $${paramIdx + 2}`,
    [...params, limit, offset],
  );

  const items = dataResult.rows.map((r: Record<string, unknown>) => mapRow(r, tenantId));
  return { items, total };
}

/** Create a new action item. */
export async function createActionItem(
  tenantId: string,
  input: {
    title: string;
    description?: string;
    sourceType?: string;
    sourceId?: string;
    assignedTo?: string;
    targetDate?: string;
    deadline?: string;
    criticality?: string;
    createdBy: string;
    verificationRequired?: boolean;
    verificationMethod?: string;
    ownerTeamId?: string;
  },
): Promise<ActionItemRecord> {
  const schema = tenantSchema(tenantId);
  const actionId = randomUUID();
  const now = new Date().toISOString();

  const result = await safeQuery(
    `INSERT INTO "${schema}".action_items
       (action_id, title, description, source_type, source_id, assigned_to,
        target_date, deadline, criticality, status, created_at, updated_at,
        created_by, updated_by, progress_percentage, verification_required,
        verification_method, owner_team_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'open',$10,$10,$11,$11,0,$12,$13,$14)
     RETURNING *`,
    [
      actionId,
      input.title,
      input.description ?? null,
      input.sourceType ?? 'manual',
      input.sourceId ?? null,
      input.assignedTo ?? null,
      input.targetDate ?? null,
      input.deadline ?? null,
      input.criticality ?? 'medium',
      now,
      input.createdBy,
      input.verificationRequired ?? false,
      input.verificationMethod ?? null,
      input.ownerTeamId ?? null,
    ],
  );

  const record = mapRow(result.rows[0], tenantId);

  recordAudit({
    tenantId,
    userId: input.createdBy,
    module: 'action',
    action: 'create',
    entityType: 'action_item',
    entityId: actionId,
    afterState: record,
  }).catch(catchHandler(EC.EVENT_BUS));

  emitEvent({
    eventType: 'action.action_item.created',
    tenantId,
    sourceService: 'action',
    severity: 'info',
    payload: { actionId, title: input.title, createdBy: input.createdBy },
  } as never).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Action item created', { actionId, tenantId });
  return record;
}

/** Update an existing action item. */
export async function updateActionItem(
  tenantId: string,
  actionId: string,
  updates: {
    title?: string;
    description?: string;
    assignedTo?: string;
    targetDate?: string;
    deadline?: string;
    criticality?: string;
    progressPercentage?: number;
    verificationRequired?: boolean;
    verificationMethod?: string;
    ownerTeamId?: string;
    updatedBy: string;
  },
): Promise<ActionItemRecord> {
  const schema = tenantSchema(tenantId);

  const columnMap: Record<string, string> = {
    title: 'title',
    description: 'description',
    assignedTo: 'assigned_to',
    targetDate: 'target_date',
    deadline: 'deadline',
    criticality: 'criticality',
    progressPercentage: 'progress_percentage',
    verificationRequired: 'verification_required',
    verificationMethod: 'verification_method',
    ownerTeamId: 'owner_team_id',
  };

  const setClauses: string[] = ['updated_at = NOW()', 'updated_by = $2'];
  const params: unknown[] = [actionId, updates.updatedBy];
  let idx = 2;

  for (const [key, col] of Object.entries(columnMap)) {
    const val = (updates as Record<string, unknown>)[key];
    if (val !== undefined) {
      idx += 1;
      setClauses.push(`${col} = $${idx}`);
      params.push(val);
    }
  }

  const result = await safeQuery(
    `UPDATE "${schema}".action_items SET ${setClauses.join(', ')}
     WHERE action_id = $1 AND deleted_at IS NULL
     RETURNING *`,
    params,
  );

  if (result.rows.length === 0) {
    throw Object.assign(new Error('Action item not found'), { statusCode: 404 });
  }

  const record = mapRow(result.rows[0], tenantId);

  recordAudit({
    tenantId,
    userId: updates.updatedBy,
    module: 'action',
    action: 'update',
    entityType: 'action_item',
    entityId: actionId,
    afterState: record,
  }).catch(catchHandler(EC.EVENT_BUS));

  logger.info('Action item updated', { actionId, tenantId });
  return record;
}

/** Daily digest: overdue, due-soon, and recently completed items for a user. */
export async function getDailyDigest(
  tenantId: string,
  userId: string,
): Promise<{
  overdue: ActionItemRecord[];
  dueSoon: ActionItemRecord[];
  recentlyCompleted: ActionItemRecord[];
}> {
  const schema = tenantSchema(tenantId);

  const overdueResult = await safeQuery(
    `SELECT * FROM "${schema}".action_items
     WHERE assigned_to = $1 AND deleted_at IS NULL
       AND status NOT IN ('closed','cancelled','verified')
       AND (deadline < NOW() OR target_date < NOW())
     ORDER BY deadline ASC NULLS LAST`,
    [userId],
  );

  const dueSoonResult = await safeQuery(
    `SELECT * FROM "${schema}".action_items
     WHERE assigned_to = $1 AND deleted_at IS NULL
       AND status NOT IN ('closed','cancelled','verified','completed')
       AND deadline IS NOT NULL
       AND deadline BETWEEN NOW() AND NOW() + INTERVAL '3 days'
     ORDER BY deadline ASC`,
    [userId],
  );

  const recentlyCompletedResult = await safeQuery(
    `SELECT * FROM "${schema}".action_items
     WHERE assigned_to = $1 AND deleted_at IS NULL
       AND status IN ('completed','verified','closed')
       AND completed_at >= NOW() - INTERVAL '7 days'
     ORDER BY completed_at DESC`,
    [userId],
  );

  return {
    overdue: overdueResult.rows.map((r: Record<string, unknown>) => mapRow(r, tenantId)),
    dueSoon: dueSoonResult.rows.map((r: Record<string, unknown>) => mapRow(r, tenantId)),
    recentlyCompleted: recentlyCompletedResult.rows.map((r: Record<string, unknown>) => mapRow(r, tenantId)),
  };
}

/** Consolidated action center: all active items sorted by criticality. */
export async function getConsolidatedActionCenter(
  tenantId: string,
  userId?: string,
): Promise<ActionItemRecord[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['deleted_at IS NULL', "status NOT IN ('closed','cancelled')"];
  const params: unknown[] = [];

  if (userId) {
    params.push(userId);
    conditions.push(`assigned_to = $${params.length}`);
  }

  const result = await safeQuery(
    `SELECT * FROM "${schema}".action_items
     WHERE ${conditions.join(' AND ')}
     ORDER BY
       CASE criticality WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END,
       CASE WHEN deadline < NOW() THEN 0 ELSE 1 END,
       deadline ASC NULLS LAST`,
    params,
  );

  return result.rows.map((r: Record<string, unknown>) => mapRow(r, tenantId));
}

/** Create an action item from a cross-module event. */
export async function createActionFromEvent(
  tenantId: string,
  source: { sourceType: string; sourceId: string; triggeredBy: string },
  details: {
    title: string;
    description?: string;
    assignedTo?: string;
    deadline?: string;
    criticality?: string;
  },
): Promise<ActionItemRecord> {
  logger.info('Creating action item from cross-module event', { tenantId, source });

  return createActionItem(tenantId, {
    title: details.title,
    description: details.description,
    sourceType: source.sourceType,
    sourceId: source.sourceId,
    assignedTo: details.assignedTo,
    deadline: details.deadline,
    criticality: details.criticality ?? 'medium',
    createdBy: source.triggeredBy,
  });
}
