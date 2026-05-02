import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface DoraAssessmentRecord {
  assessment_id: string;
  tenant_id: string;
  title: string;
  description: string;
  pillar: string;
  status: string;
  score: number;
  assessor_id: string;
  ict_provider_id: string;
  assessment_date: string | null;
  next_review_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateDoraAssessmentInput {
  title: string;
  description?: string;
  pillar: string;
  status?: string;
  score?: number;
  assessor_id?: string;
  ict_provider_id?: string;
  assessment_date?: string;
  next_review_date?: string;
}

export interface ListDoraAssessmentOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `assessment_id, tenant_id, title, description, pillar, status, score, assessor_id, ict_provider_id, assessment_date, next_review_date, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListDoraAssessmentOptions = {},
): Promise<{ data: DoraAssessmentRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.dora_assessments ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.dora_assessments ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as DoraAssessmentRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[dora-service] Failed to list dora-assessments', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<DoraAssessmentRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.dora_assessments WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as DoraAssessmentRecord) || null;
  } catch (err) {
    logger.error('[dora-service] Failed to get dora-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateDoraAssessmentInput): Promise<DoraAssessmentRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.dora_assessments (assessment_id, tenant_id, title, description, pillar, status, score, assessor_id, ict_provider_id, assessment_date, next_review_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.pillar ?? null, input.status ?? null, input.score ?? null, input.assessor_id ?? null, input.ict_provider_id ?? null, input.assessment_date ?? null, input.next_review_date ?? null],
    );
    logger.info('[dora-service] DoraAssessment created', { id, tenantId });
    const created = result.rows[0] as DoraAssessmentRecord;
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[dora-service] Failed to create dora-assessment', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateDoraAssessmentInput>): Promise<DoraAssessmentRecord | null> {
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
      `UPDATE dos.dora_assessments SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND assessment_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[dora-service] DoraAssessment updated', { id, tenantId });
    const updated = (result.rows[0] as DoraAssessmentRecord) || null;
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[dora-service] Failed to update dora-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.dora_assessments SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[dora-service] DoraAssessment deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[dora-service] Failed to delete dora-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.dora_assessments SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[dora-service] DoraAssessment restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[dora-service] Failed to restore dora-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateDoraAssessmentInput[]): Promise<DoraAssessmentRecord[]> {
  const results: DoraAssessmentRecord[] = [];
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
      `UPDATE dos.dora_assessments SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[dora-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.dora_assessments WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.dora_assessments WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[dora-service] Failed to get dora-assessment stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/dora with try/catch guards

/**
 * Get DORA obligation status from the module.
 */
export async function getObligationStatus(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/dora/dist/dora/services/dora-obligation.service') as any;
    return mod.getObligationStatus(tenantId);
  } catch (err) {
    logger.warn('[dora-service] Module obligation service unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get DORA resilience assessment from the module.
 */
export async function getResilienceAssessment(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/dora/dist/dora/services/dora-resilience.service') as any;
    return mod.getResilienceAssessment(tenantId);
  } catch (err) {
    logger.warn('[dora-service] Module resilience service unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get DORA mapping data from the module.
 */
export async function getDoraMapping(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/dora/dist/dora/services/dora-mapping.service') as any;
    return mod.getMapping(tenantId);
  } catch (err) {
    logger.warn('[dora-service] Module mapping service unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get DORA dashboard data from the module.
 */
export async function getDoraDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/dora/dist/dora/services/dora-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[dora-service] Module dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition DORA lifecycle status using module lifecycle service.
 */
export async function transitionStatus(
  tenantId: string,
  assessmentId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/dora/dist/dora/services/dora-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, assessmentId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[dora-service] Module lifecycle unavailable', { assessmentId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module obligation check if available.
 */
async function afterCreate(tenantId: string, record: DoraAssessmentRecord): Promise<void> {
  try {
    if (record.pillar) {
      await getObligationStatus(tenantId);
    }
  } catch (err) {
    logger.warn('[dora-service] Post-create hook failed (non-fatal)', { assessmentId: record.assessment_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-assess when relevant fields change.
 */
async function afterUpdate(tenantId: string, record: DoraAssessmentRecord, changedFields: Partial<CreateDoraAssessmentInput>): Promise<void> {
  try {
    const relevantFields = ['score', 'status', 'pillar'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange) {
      await getResilienceAssessment(tenantId);
    }
  } catch (err) {
    logger.warn('[dora-service] Post-update hook failed (non-fatal)', { assessmentId: record.assessment_id, error: toErrorMessage(err) });
  }
}

export const DoraAssessmentService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  getObligationStatus, getResilienceAssessment, getDoraMapping, getDoraDashboard, transitionStatus,
};
