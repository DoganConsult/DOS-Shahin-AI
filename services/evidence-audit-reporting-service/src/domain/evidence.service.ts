import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface EvidenceRecord {
  evidence_id: string;
  tenant_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  control_id: string;
  requirement_id: string;
  collector_id: string;
  file_path: string;
  file_size: number;
  hash: string;
  validity_start: string;
  validity_end: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateEvidenceInput {
  title: string;
  description?: string;
  type: string;
  status?: string;
  control_id?: string;
  requirement_id?: string;
  collector_id?: string;
  file_path?: string;
  file_size?: number;
  hash?: string;
  validity_start?: string;
  validity_end?: string;
}

export interface ListEvidenceOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `evidence_id, tenant_id, title, description, type, status, control_id, requirement_id, collector_id, file_path, file_size, hash, validity_start, validity_end, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListEvidenceOptions = {},
): Promise<{ data: EvidenceRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.evidence ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.evidence ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as EvidenceRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to list evidences', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<EvidenceRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.evidence WHERE tenant_id = $1 AND evidence_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as EvidenceRecord) || null;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to get evidence', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateEvidenceInput): Promise<EvidenceRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.evidence (evidence_id, tenant_id, title, description, type, status, control_id, requirement_id, collector_id, file_path, file_size, hash, validity_start, validity_end, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.type ?? null, input.status ?? null, input.control_id ?? null, input.requirement_id ?? null, input.collector_id ?? null, input.file_path ?? null, input.file_size ?? null, input.hash ?? null, input.validity_start ?? null, input.validity_end ?? null],
    );
    logger.info('[evidence-audit-reporting-service] Evidence created', { id, tenantId });
    const created = result.rows[0] as EvidenceRecord;
    // Wave 2B: fire-and-forget module scoring hook
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to create evidence', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateEvidenceInput>): Promise<EvidenceRecord | null> {
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
      `UPDATE dos.evidence SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND evidence_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[evidence-audit-reporting-service] Evidence updated', { id, tenantId });
    const updated = (result.rows[0] as EvidenceRecord) || null;
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to update evidence', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.evidence SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND evidence_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[evidence-audit-reporting-service] Evidence deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to delete evidence', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.evidence SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND evidence_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[evidence-audit-reporting-service] Evidence restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to restore evidence', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateEvidenceInput[]): Promise<EvidenceRecord[]> {
  const results: EvidenceRecord[] = [];
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
      `UPDATE dos.evidence SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND evidence_id IN (${placeholders}) AND deleted_at IS NULL`,
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
      `SELECT COUNT(*)::int AS total FROM dos.evidence WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.evidence WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[evidence-audit-reporting-service] Failed to get evidence stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/evidence and modules/audit

/**
 * Score evidence quality using the module's scoring engine.
 */
export async function scoreEvidence(
  tenantId: string,
  evidenceId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/evidence/dist/backend/evidence/services/analysis/evidence-scoring.service') as any;
    return mod.scoreEvidence(tenantId, evidenceId);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Module evidence scoring unavailable', { evidenceId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get evidence quality score from the module.
 */
export async function getEvidenceQuality(
  tenantId: string,
  evidenceId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/evidence/dist/backend/evidence/services/analysis/evidence-quality-scoring.service') as any;
    return mod.getQualityScore(tenantId, evidenceId);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Module quality scoring unavailable', { evidenceId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Check evidence freshness from the module.
 */
export async function checkFreshness(
  tenantId: string,
  evidenceId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/evidence/dist/backend/evidence/services/collection/evidence-freshness.service') as any;
    return mod.checkFreshness(tenantId, evidenceId);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Module freshness check unavailable', { evidenceId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get evidence dashboard data from the module.
 */
export async function getEvidenceDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/evidence/dist/backend/evidence/services/reporting/evidence-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Module evidence dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition evidence lifecycle status using module lifecycle service.
 */
export async function transitionEvidenceStatus(
  tenantId: string,
  evidenceId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/evidence/dist/backend/evidence/services/core/evidence-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, evidenceId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Module evidence lifecycle unavailable', { evidenceId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get audit dashboard data from the audit module.
 */
export async function getAuditDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/audit/dist/audit/services/audit-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Module audit dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition audit lifecycle status using audit module lifecycle service.
 */
export async function transitionAuditStatus(
  tenantId: string,
  entityId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/audit/dist/audit/services/audit-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, entityId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Module audit lifecycle unavailable', { entityId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module scoring if available.
 */
async function afterCreate(tenantId: string, record: EvidenceRecord): Promise<void> {
  try {
    await scoreEvidence(tenantId, record.evidence_id);
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Post-create scoring failed (non-fatal)', { evidenceId: record.evidence_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-score when relevant fields change.
 */
async function afterUpdate(tenantId: string, record: EvidenceRecord, changedFields: Partial<CreateEvidenceInput>): Promise<void> {
  try {
    const relevantFields = ['status', 'type', 'hash', 'file_path', 'validity_end'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange) {
      await scoreEvidence(tenantId, record.evidence_id);
    }
  } catch (err) {
    logger.warn('[evidence-audit-reporting-service] Post-update re-scoring failed (non-fatal)', { evidenceId: record.evidence_id, error: toErrorMessage(err) });
  }
}

export const EvidenceService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  scoreEvidence, getEvidenceQuality, checkFreshness, getEvidenceDashboard, transitionEvidenceStatus,
  getAuditDashboard, transitionAuditStatus,
};
