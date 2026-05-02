import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface RemediationRecord {
  remediation_id: string;
  tenant_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  source_type: string;
  source_id: string;
  assignee_id: string;
  due_date: string | null;
  completed_at: string | null;
  verification_status: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateRemediationInput {
  title: string;
  description?: string;
  type?: string;
  status?: string;
  priority: string;
  source_type?: string;
  source_id?: string;
  assignee_id?: string;
  due_date?: string;
  completed_at?: string;
  verification_status?: string;
}

export interface ListRemediationOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `remediation_id, tenant_id, title, description, type, status, priority, source_type, source_id, assignee_id, due_date, completed_at, verification_status, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListRemediationOptions = {},
): Promise<{ data: RemediationRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  let idx = 2;

  if (options.status) {
    conditions.push(`status = $${idx}`);
    params.push(options.status);
    idx++;
  }

  if (options.search) {
    conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
    params.push(`%${options.search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;
  const sortCol = options.sortBy && ['created_at', 'updated_at', 'title', 'status'].includes(options.sortBy) ? options.sortBy : 'created_at';
  const sortDir = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    const countResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.remediations ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.remediations ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as RemediationRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[remediation-action-service] Failed to list remediations', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<RemediationRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.remediations WHERE tenant_id = $1 AND remediation_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as RemediationRecord) || null;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to get remediation', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateRemediationInput): Promise<RemediationRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.remediations (remediation_id, tenant_id, title, description, type, status, priority, source_type, source_id, assignee_id, due_date, completed_at, verification_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.type ?? null, input.status ?? null, input.priority ?? null, input.source_type ?? null, input.source_id ?? null, input.assignee_id ?? null, input.due_date ?? null, input.completed_at ?? null, input.verification_status ?? null],
    );
    logger.info('[remediation-action-service] Remediation created', { id, tenantId });
    const created = result.rows[0] as RemediationRecord;
    // Wave 2B: fire-and-forget module hook
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to create remediation', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateRemediationInput>): Promise<RemediationRecord | null> {
  const existing = await getById(tenantId, id);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [tenantId, id];
  let idx = 3;

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      const col = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      setClauses.push(`${col} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (setClauses.length === 0) return existing;

  setClauses.push('updated_at = NOW()');

  try {
    const result = await safeQuery(
      `UPDATE dos.remediations SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND remediation_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[remediation-action-service] Remediation updated', { id, tenantId });
    const updated = (result.rows[0] as RemediationRecord) || null;
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to update remediation', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.remediations SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND remediation_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[remediation-action-service] Remediation soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to delete remediation', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<RemediationRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.remediations SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND remediation_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows.length === 0) return null;
    logger.info('[remediation-action-service] Remediation restored', { id, tenantId });
    return result.rows[0] as RemediationRecord;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to restore remediation', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateRemediationInput[]): Promise<RemediationRecord[]> {
  const results: RemediationRecord[] = [];
  for (const input of items) {
    const item = await create(tenantId, input);
    results.push(item);
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
    const result = await safeQuery(
      `UPDATE dos.remediations SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND remediation_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    logger.info('[remediation-action-service] Remediations bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[remediation-action-service] Failed to bulk delete remediations', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.remediations WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.remediations WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[remediation-action-service] Failed to get remediation stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/remediation and modules/action

/**
 * Get remediation plan from the module.
 */
export async function getRemediationPlan(
  tenantId: string,
  remediationId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/remediation/dist/remediation/services/remediation-plan.service') as any;
    return mod.getRemediationPlan(tenantId, remediationId);
  } catch (err) {
    logger.warn('[remediation-action-service] Module remediation plan unavailable', { remediationId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Verify remediation completion from the module.
 */
export async function verifyRemediation(
  tenantId: string,
  remediationId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/remediation/dist/remediation/services/remediation-verification.service') as any;
    return mod.verifyRemediation(tenantId, remediationId);
  } catch (err) {
    logger.warn('[remediation-action-service] Module verification unavailable', { remediationId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get remediation tracking data from the module.
 */
export async function getRemediationTracking(
  tenantId: string,
  remediationId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/remediation/dist/remediation/services/remediation-tracking.service') as any;
    return mod.getTracking(tenantId, remediationId);
  } catch (err) {
    logger.warn('[remediation-action-service] Module tracking unavailable', { remediationId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get remediation dashboard data from the module.
 */
export async function getRemediationDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/remediation/dist/remediation/services/remediation-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[remediation-action-service] Module dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition remediation lifecycle status using module lifecycle service.
 */
export async function transitionRemediationStatus(
  tenantId: string,
  remediationId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/remediation/dist/remediation/services/remediation-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, remediationId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[remediation-action-service] Module remediation lifecycle unavailable', { remediationId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get action dashboard data from the action module.
 */
export async function getActionDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/action/dist/action/services/action-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[remediation-action-service] Module action dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition action lifecycle status using action module lifecycle service.
 */
export async function transitionActionStatus(
  tenantId: string,
  actionId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/action/dist/action/services/action-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, actionId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[remediation-action-service] Module action lifecycle unavailable', { actionId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Check overdue actions from the action module.
 */
export async function checkOverdueActions(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/action/dist/action/services/action-overdue-monitor.service') as any;
    return mod.checkOverdue(tenantId);
  } catch (err) {
    logger.warn('[remediation-action-service] Module overdue monitor unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module plan generation if available.
 */
async function afterCreate(tenantId: string, record: RemediationRecord): Promise<void> {
  try {
    await getRemediationPlan(tenantId, record.remediation_id);
  } catch (err) {
    logger.warn('[remediation-action-service] Post-create hook failed (non-fatal)', { remediationId: record.remediation_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-verify when status changes.
 */
async function afterUpdate(tenantId: string, record: RemediationRecord, changedFields: Partial<CreateRemediationInput>): Promise<void> {
  try {
    const relevantFields = ['status', 'verification_status', 'priority'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange && changedFields.status === 'completed') {
      await verifyRemediation(tenantId, record.remediation_id);
    }
  } catch (err) {
    logger.warn('[remediation-action-service] Post-update hook failed (non-fatal)', { remediationId: record.remediation_id, error: toErrorMessage(err) });
  }
}

export async function assignRemediation(
  tenantId: string,
  remediationId: string,
  assigneeId: string,
  userId: string,
  requireApproval = false,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/remediation/dist/remediation/services/remediation-assignment.service') as any;
    return mod.assignRemediation(tenantId, remediationId, assigneeId, userId, requireApproval);
  } catch (err) {
    logger.warn('[remediation-action-service] Module assignment unavailable, using direct DB', { remediationId, error: toErrorMessage(err) });
    const status = requireApproval ? 'pending_assignment_approval' : 'assigned';
    const result = await safeQuery(
      `UPDATE dos.remediation_items SET assignee_id = $1, assigned_by = $2, assigned_at = NOW(), status = $3, updated_at = NOW() WHERE tenant_id = $4 AND remediation_id = $5 AND deleted_at IS NULL RETURNING *`,
      [assigneeId, userId, status, tenantId, remediationId],
    ).catch(() => ({ rows: [] }));
    return result.rows[0] ?? null;
  }
}

export async function getAssignmentHistory(
  tenantId: string,
  remediationId: string,
): Promise<unknown[]> {
  try {
    const mod = require('../../../modules/remediation/dist/remediation/services/remediation-assignment.service') as any;
    return mod.getAssignmentHistory(tenantId, remediationId);
  } catch (err) {
    logger.warn('[remediation-action-service] Module assignment history unavailable', { remediationId, error: toErrorMessage(err) });
    return [];
  }
}

export const RemediationService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  getRemediationPlan, verifyRemediation, getRemediationTracking, getRemediationDashboard,
  transitionRemediationStatus, getActionDashboard, transitionActionStatus, checkOverdueActions,
  assignRemediation, getAssignmentHistory,
};
