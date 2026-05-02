import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface BriefingRecord {
  briefing_id: string;
  tenant_id: string;
  title: string;
  summary: string;
  type: string;
  status: string;
  period_start: string;
  period_end: string;
  risk_posture: string;
  compliance_score: number;
  key_metrics: unknown;
  recommendations: unknown;
  author_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateBriefingInput {
  title: string;
  summary?: string;
  type: string;
  status?: string;
  period_start?: string;
  period_end?: string;
  risk_posture?: string;
  compliance_score?: number;
  key_metrics?: unknown;
  recommendations?: unknown;
  author_id?: string;
}

export interface ListBriefingOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `briefing_id, tenant_id, title, summary, type, status, period_start, period_end, risk_posture, compliance_score, key_metrics, recommendations, author_id, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListBriefingOptions = {},
): Promise<{ data: BriefingRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.executive_briefings ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.executive_briefings ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as BriefingRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to list briefings', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<BriefingRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.executive_briefings WHERE tenant_id = $1 AND briefing_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as BriefingRecord) || null;
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to get briefing', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateBriefingInput): Promise<BriefingRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.executive_briefings (briefing_id, tenant_id, title, summary, type, status, period_start, period_end, risk_posture, compliance_score, key_metrics, recommendations, author_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.summary ?? null, input.type ?? null, input.status ?? null, input.period_start ?? null, input.period_end ?? null, input.risk_posture ?? null, input.compliance_score ?? null, input.key_metrics ?? null, input.recommendations ?? null, input.author_id ?? null],
    );
    logger.info('[executive-intelligence-service] Briefing created', { id, tenantId });
    return result.rows[0] as BriefingRecord;
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to create briefing', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateBriefingInput>): Promise<BriefingRecord | null> {
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
      `UPDATE dos.executive_briefings SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND briefing_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[executive-intelligence-service] Briefing updated', { id, tenantId });
    return (result.rows[0] as BriefingRecord) || null;
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to update briefing', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.executive_briefings SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND briefing_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[executive-intelligence-service] Briefing deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to delete briefing', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<BriefingRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.executive_briefings SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND briefing_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows[0]) {
      logger.info('[executive-intelligence-service] Briefing restored', { id, tenantId });
      return result.rows[0] as BriefingRecord;
    }
    return null;
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to restore briefing', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateBriefingInput[]): Promise<BriefingRecord[]> {
  const results: BriefingRecord[] = [];
  for (const item of items) {
    results.push(await create(tenantId, item));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.executive_briefings SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND briefing_id = ANY($2) AND deleted_at IS NULL`,
      [tenantId, ids],
    );
    logger.info('[executive-intelligence-service] Briefings bulk deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to bulk delete briefings', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.executive_briefings WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.executive_briefings WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[executive-intelligence-service] Failed to get briefing stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/executive with try/catch guards

/**
 * Create executive brief via module.
 */
export async function createBrief(tenantId: string, userId: string, data: { title: string; referenceDate?: string; generationMethod?: string }): Promise<unknown> {
  try {
    const mod = require('../../../modules/executive/dist/executive/services/executive.service') as any;
    return mod.createBrief(tenantId, userId, data);
  } catch (err) {
    logger.warn('[executive-intelligence-service] Module createBrief unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * List executive briefs via module.
 */
export async function listBriefs(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/executive/dist/executive/services/executive.service') as any;
    return mod.listBriefs(tenantId);
  } catch (err) {
    logger.warn('[executive-intelligence-service] Module listBriefs unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Create strategic objective via module.
 */
export async function createObjective(tenantId: string, userId: string, data: Record<string, unknown>): Promise<unknown> {
  try {
    const mod = require('../../../modules/executive/dist/executive/services/executive.service') as any;
    return mod.createObjective(tenantId, userId, data);
  } catch (err) {
    logger.warn('[executive-intelligence-service] Module createObjective unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * List strategic objectives via module.
 */
export async function listObjectives(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/executive/dist/executive/services/executive.service') as any;
    return mod.listObjectives(tenantId);
  } catch (err) {
    logger.warn('[executive-intelligence-service] Module listObjectives unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Approve executive brief via module.
 */
export async function approveBrief(tenantId: string, briefId: string, userId: string, status: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/executive/dist/executive/services/executive.service') as any;
    return mod.approveBrief(tenantId, briefId, userId, status);
  } catch (err) {
    logger.warn('[executive-intelligence-service] Module approveBrief unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

export const BriefingService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, createBrief, listBriefs, createObjective, listObjectives, approveBrief };
