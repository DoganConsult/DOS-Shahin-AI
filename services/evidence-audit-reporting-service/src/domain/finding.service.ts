import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface FindingRecord {
  finding_id: string;
  tenant_id: string;
  audit_id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  category: string;
  control_ref: string;
  recommendation: string;
  assignee_id: string;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateFindingInput {
  audit_id?: string;
  title: string;
  description?: string;
  severity: string;
  status?: string;
  category?: string;
  control_ref?: string;
  recommendation?: string;
  assignee_id?: string;
  due_date?: string;
}

export interface ListFindingOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `finding_id, tenant_id, audit_id, title, description, severity, status, category, control_ref, recommendation, assignee_id, due_date, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListFindingOptions = {},
): Promise<{ data: FindingRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.audit_findings ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.audit_findings ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as FindingRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to list findings', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<FindingRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.audit_findings WHERE tenant_id = $1 AND finding_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as FindingRecord) || null;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to get finding', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateFindingInput): Promise<FindingRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.audit_findings (finding_id, tenant_id, audit_id, title, description, severity, status, category, control_ref, recommendation, assignee_id, due_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.audit_id ?? null, input.title ?? null, input.description ?? null, input.severity ?? null, input.status ?? null, input.category ?? null, input.control_ref ?? null, input.recommendation ?? null, input.assignee_id ?? null, input.due_date ?? null],
    );
    logger.info('[evidence-audit-reporting-service] Finding created', { id, tenantId });
    return result.rows[0] as FindingRecord;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to create finding', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateFindingInput>): Promise<FindingRecord | null> {
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
      `UPDATE dos.audit_findings SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND finding_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[evidence-audit-reporting-service] Finding updated', { id, tenantId });
    return (result.rows[0] as FindingRecord) || null;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to update finding', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.audit_findings SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND finding_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[evidence-audit-reporting-service] Finding deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to delete finding', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.audit_findings SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND finding_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[evidence-audit-reporting-service] Finding restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to restore finding', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateFindingInput[]): Promise<FindingRecord[]> {
  const results: FindingRecord[] = [];
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
      `UPDATE dos.audit_findings SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND finding_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.audit_findings WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.audit_findings WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to get finding stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const FindingService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats };
