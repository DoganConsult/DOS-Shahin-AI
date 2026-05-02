import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface RiskRecord {
  risk_id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  category: string | null;
  likelihood: number | null;
  impact: number | null;
  risk_score: number | null;
  status: string;
  treatment_plan: string | null;
  owner_user_id: string | null;
  created_by: string | null;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
  is_deleted: boolean;
}

export interface CreateRiskInput {
  title: string;
  description?: string;
  category?: string;
  likelihood?: string | number;
  impact?: string | number;
  risk_score?: number;
  status?: string;
  treatment_plan?: string;
  owner_id?: string;
}

export interface ListRiskOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const RISK_COLUMNS = `risk_id, tenant_id, title, description, category, likelihood, impact, risk_score, status, treatment_plan, owner_user_id, created_by, created_at, updated_at, deleted_at, is_deleted`;

function scoreFromLabel(label: string | number | undefined, defaultVal: number): number {
  if (typeof label === 'number' && label >= 1 && label <= 5) return label;
  if (!label || typeof label !== 'string') return defaultVal;
  const l = label.toLowerCase();
  if (l === 'critical' || l === 'very high') return 5;
  if (l === 'high') return 4;
  if (l === 'medium' || l === 'moderate') return 3;
  if (l === 'low') return 2;
  if (l === 'negligible' || l === 'very low') return 1;
  return defaultVal;
}

export async function list(
  tenantId: string,
  options: ListRiskOptions = {},
): Promise<{ data: RiskRecord[]; total: number; page: number; pageSize: number }> {
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
    const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM dos.risks ${where}`, params);
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${RISK_COLUMNS} FROM dos.risks ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as RiskRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[risk-incident-service] Failed to list risks', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<RiskRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${RISK_COLUMNS} FROM dos.risks WHERE tenant_id = $1 AND risk_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as RiskRecord) || null;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to get risk', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateRiskInput): Promise<RiskRecord> {
  const id = randomUUID();
  const likelihood = scoreFromLabel(input.likelihood, 3);
  const impact = scoreFromLabel(input.impact, 3);
  try {
    const result = await safeQuery(
      `INSERT INTO dos.risks (
        risk_id, tenant_id, title, description, category, likelihood, impact,
        status, treatment_plan, owner_user_id, created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
      ) RETURNING ${RISK_COLUMNS}`,
      [
        id,
        tenantId,
        input.title,
        input.description ?? null,
        input.category ?? null,
        likelihood,
        impact,
        input.status ?? 'open',
        input.treatment_plan ?? null,
        input.owner_id ?? null,
        null,
      ],
    );
    logger.info('[risk-incident-service] Risk created', { id, tenantId });
    return result.rows[0] as RiskRecord;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to create risk', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, riskId: string, data: Partial<CreateRiskInput>): Promise<RiskRecord | null> {
  const existing = await getById(tenantId, riskId);
  if (!existing) return null;

  const setClauses: string[] = [];
  const params: unknown[] = [tenantId, riskId];
  let idx = 3;

  const map: Record<string, string> = {
    title: 'title',
    description: 'description',
    category: 'category',
    status: 'status',
    treatment_plan: 'treatment_plan',
    owner_id: 'owner_user_id',
  };

  for (const [key, col] of Object.entries(map)) {
    const value = (data as Record<string, unknown>)[key];
    if (value !== undefined) {
      setClauses.push(`${col} = $${idx}`);
      params.push(value);
      idx++;
    }
  }

  if (data.likelihood !== undefined) {
    setClauses.push(`likelihood = $${idx}`);
    params.push(scoreFromLabel(data.likelihood, 3));
    idx++;
  }
  if (data.impact !== undefined) {
    setClauses.push(`impact = $${idx}`);
    params.push(scoreFromLabel(data.impact, 3));
    idx++;
  }

  if (setClauses.length === 0) return existing;

  setClauses.push('updated_at = NOW()');

  try {
    const result = await safeQuery(
      `UPDATE dos.risks SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND risk_id = $2 RETURNING ${RISK_COLUMNS}`,
      params,
    );
    logger.info('[risk-incident-service] Risk updated', { riskId, tenantId });
    return (result.rows[0] as RiskRecord) || null;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to update risk', { tenantId, riskId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.risks SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND risk_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount && result.rowCount > 0) {
      logger.info('[risk-incident-service] Risk soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to delete risk', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.risks SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND risk_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount && result.rowCount > 0) {
      logger.info('[risk-incident-service] Risk restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to restore risk', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const placeholders = ids.map((_, i) => `$${i + 2}`).join(', ');
  try {
    const result = await safeQuery(
      `UPDATE dos.risks SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND risk_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount ?? 0;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to bulk remove risks', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.risks WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.risks WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as { status: string }).status] = (row as { count: number }).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[risk-incident-service] Failed to get risk stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const RiskService = { list, getById, create, update, remove, restore, bulkRemove, getStats };
