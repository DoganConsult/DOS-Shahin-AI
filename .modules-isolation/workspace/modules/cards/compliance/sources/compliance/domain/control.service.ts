import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ControlRecord {
  control_id: string;
  tenant_id: string;
  control_ref: string;
  title: string;
  description: string;
  category: string;
  type: string;
  status: string;
  effectiveness: string;
  owner_id: string;
  implementation_status: string;
  test_frequency: string;
  last_tested_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateControlInput {
  control_ref: string;
  title: string;
  description?: string;
  category?: string;
  type?: string;
  status?: string;
  effectiveness?: string;
  owner_id?: string;
  implementation_status?: string;
  test_frequency?: string;
  last_tested_at?: string;
}

export interface ListControlOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `control_id, tenant_id, control_ref, title, description, category, type, status, effectiveness, owner_id, implementation_status, test_frequency, last_tested_at, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListControlOptions = {},
): Promise<{ data: ControlRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.controls ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.controls ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as ControlRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to list controls', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<ControlRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.controls WHERE tenant_id = $1 AND control_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as ControlRecord) || null;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to get control', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateControlInput): Promise<ControlRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.controls (control_id, tenant_id, control_ref, title, description, category, type, status, effectiveness, owner_id, implementation_status, test_frequency, last_tested_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.control_ref ?? null, input.title ?? null, input.description ?? null, input.category ?? null, input.type ?? null, input.status ?? null, input.effectiveness ?? null, input.owner_id ?? null, input.implementation_status ?? null, input.test_frequency ?? null, input.last_tested_at ?? null],
    );
    logger.info('[compliance-controls-service] Control created', { id, tenantId });
    const created = result.rows[0] as ControlRecord;
    // Wave 2B: fire-and-forget module hook
    afterControlCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to create control', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateControlInput>): Promise<ControlRecord | null> {
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
      `UPDATE dos.controls SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND control_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[compliance-controls-service] Control updated', { id, tenantId });
    const updated = (result.rows[0] as ControlRecord) || null;
    // Wave 2B: fire-and-forget module hook
    if (updated) {
      afterControlUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to update control', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.controls SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND control_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[compliance-controls-service] Control deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to delete control', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.controls SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND control_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[compliance-controls-service] Control restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to restore control', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateControlInput[]): Promise<ControlRecord[]> {
  const results: ControlRecord[] = [];
  for (const input of items) {
    results.push(await create(tenantId, input));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  try {
    const result = await safeQuery(
      `UPDATE dos.controls SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND control_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.controls WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.controls WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to get control stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/compliance (controls) with try/catch guards

/**
 * Get control lifecycle state from the CCM module.
 */
export async function getControlLifecycleState(tenantId: string, controlId: string): Promise<unknown> {
  try {
    const lifecycle = require(
      '../../../modules/compliance/dist/compliance/services/ccm/control-lifecycle.service'
    );
    return lifecycle;
  } catch (err) {
    logger.warn('[compliance-controls-service] Module control lifecycle unavailable', { controlId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get control dependency graph from module.
 */
export async function getControlDependencyGraph(tenantId: string): Promise<unknown> {
  try {
    const graph = require(
      '../../../modules/compliance/dist/compliance/services/control-dependency-graph.service'
    );
    return graph;
  } catch (err) {
    logger.warn('[compliance-controls-service] Module control dependency graph unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: snapshot after control creation.
 */
async function afterControlCreate(tenantId: string, _record: ControlRecord): Promise<void> {
  try {
    const drift = require(
      '../../../modules/compliance/dist/compliance/services/compliance/automation/compliance-drift-detection.service'
    );
    await drift.captureComplianceOverviewSnapshot(tenantId);
  } catch {
    // Non-fatal: module may not be available
  }
}

/**
 * After-update hook: re-check effectiveness when relevant fields change.
 */
async function afterControlUpdate(tenantId: string, _record: ControlRecord, changedFields: Partial<CreateControlInput>): Promise<void> {
  try {
    const relevantFields = ['effectiveness', 'status', 'implementation_status'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange) {
      const drift = require(
        '../../../modules/compliance/dist/compliance/services/compliance/automation/compliance-drift-detection.service'
      );
      await drift.detectComplianceDrift(tenantId);
    }
  } catch {
    // Non-fatal: module may not be available
  }
}

export const ControlService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  getControlLifecycleState, getControlDependencyGraph,
};
