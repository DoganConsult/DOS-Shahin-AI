import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface IncidentRecord {
  incident_id: string;
  tenant_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  reporter_id: string;
  assignee_id: string;
  category: string;
  impact_assessment: string;
  root_cause: string;
  resolution: string;
  detected_at: string | null;
  resolved_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateIncidentInput {
  title: string;
  description?: string;
  severity: string;
  status?: string;
  reporter_id?: string;
  assignee_id?: string;
  category?: string;
  impact_assessment?: string;
  root_cause?: string;
  resolution?: string;
  detected_at?: string;
  resolved_at?: string;
}

export interface ListIncidentOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `incident_id, tenant_id, title, description, severity, status, reporter_id, assignee_id, category, impact_assessment, root_cause, resolution, detected_at, resolved_at, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListIncidentOptions = {},
): Promise<{ data: IncidentRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.incidents ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.incidents ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as IncidentRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[risk-incident-service] Failed to list incidents', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<IncidentRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.incidents WHERE tenant_id = $1 AND incident_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as IncidentRecord) || null;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to get incident', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateIncidentInput): Promise<IncidentRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.incidents (incident_id, tenant_id, title, description, severity, status, reporter_id, assignee_id, category, impact_assessment, root_cause, resolution, detected_at, resolved_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.severity ?? null, input.status ?? null, input.reporter_id ?? null, input.assignee_id ?? null, input.category ?? null, input.impact_assessment ?? null, input.root_cause ?? null, input.resolution ?? null, input.detected_at ?? null, input.resolved_at ?? null],
    );
    logger.info('[risk-incident-service] Incident created', { id, tenantId });
    return result.rows[0] as IncidentRecord;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to create incident', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateIncidentInput>): Promise<IncidentRecord | null> {
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
      `UPDATE dos.incidents SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND incident_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[risk-incident-service] Incident updated', { id, tenantId });
    return (result.rows[0] as IncidentRecord) || null;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to update incident', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.incidents SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND incident_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[risk-incident-service] Incident deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to delete incident', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.incidents SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND incident_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[risk-incident-service] Incident restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to restore incident', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateIncidentInput[]): Promise<IncidentRecord[]> {
  const results: IncidentRecord[] = [];
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
      `UPDATE dos.incidents SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND incident_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.incidents WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.incidents WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[risk-incident-service] Failed to get incident stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const IncidentService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats };
