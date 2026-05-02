import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface PrivacyAssessmentRecord {
  assessment_id: string;
  tenant_id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  data_category: string;
  processing_purpose: string;
  legal_basis: string;
  risk_level: number;
  dpo_review: boolean;
  assessor_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreatePrivacyAssessmentInput {
  title: string;
  description?: string;
  type: string;
  status?: string;
  data_category?: string;
  processing_purpose?: string;
  legal_basis?: string;
  risk_level?: number;
  dpo_review?: boolean;
  assessor_id?: string;
}

export interface ListPrivacyAssessmentOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `assessment_id, tenant_id, title, description, type, status, data_category, processing_purpose, legal_basis, risk_level, dpo_review, assessor_id, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListPrivacyAssessmentOptions = {},
): Promise<{ data: PrivacyAssessmentRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.privacy_assessments ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.privacy_assessments ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as PrivacyAssessmentRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[privacy-service] Failed to list privacy-assessments', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<PrivacyAssessmentRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.privacy_assessments WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as PrivacyAssessmentRecord) || null;
  } catch (err) {
    logger.error('[privacy-service] Failed to get privacy-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreatePrivacyAssessmentInput): Promise<PrivacyAssessmentRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.privacy_assessments (assessment_id, tenant_id, title, description, type, status, data_category, processing_purpose, legal_basis, risk_level, dpo_review, assessor_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.type ?? null, input.status ?? null, input.data_category ?? null, input.processing_purpose ?? null, input.legal_basis ?? null, input.risk_level ?? null, input.dpo_review ?? null, input.assessor_id ?? null],
    );
    logger.info('[privacy-service] PrivacyAssessment created', { id, tenantId });
    const created = result.rows[0] as PrivacyAssessmentRecord;
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[privacy-service] Failed to create privacy-assessment', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreatePrivacyAssessmentInput>): Promise<PrivacyAssessmentRecord | null> {
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
      `UPDATE dos.privacy_assessments SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[privacy-service] PrivacyAssessment updated', { id, tenantId });
    const updated = (result.rows[0] as PrivacyAssessmentRecord) || null;
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[privacy-service] Failed to update privacy-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.privacy_assessments SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[privacy-service] PrivacyAssessment deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[privacy-service] Failed to delete privacy-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<PrivacyAssessmentRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.privacy_assessments SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows[0]) {
      logger.info('[privacy-service] PrivacyAssessment restored', { id, tenantId });
      return result.rows[0] as PrivacyAssessmentRecord;
    }
    return null;
  } catch (err) {
    logger.error('[privacy-service] Failed to restore privacy-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreatePrivacyAssessmentInput[]): Promise<PrivacyAssessmentRecord[]> {
  const results: PrivacyAssessmentRecord[] = [];
  for (const item of items) {
    results.push(await create(tenantId, item));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.privacy_assessments SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id = ANY($2) AND deleted_at IS NULL`,
      [tenantId, ids],
    );
    logger.info('[privacy-service] PrivacyAssessments bulk deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[privacy-service] Failed to bulk delete privacy-assessments', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.privacy_assessments WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.privacy_assessments WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[privacy-service] Failed to get privacy-assessment stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/privacy with try/catch guards

/**
 * Run Privacy Impact Assessment (PIA) engine from the module.
 */
export async function runPIA(
  tenantId: string,
  assessmentId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/privacy/dist/privacy/services/privacy-pia-engine.service') as any;
    return mod.runPIA(tenantId, assessmentId);
  } catch (err) {
    logger.warn('[privacy-service] Module PIA engine unavailable', { assessmentId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Process Data Subject Request (DSR) from the module.
 */
export async function processDSR(
  tenantId: string,
  requestId: string,
  requestType: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/privacy/dist/privacy/services/privacy-dsr-processor.service') as any;
    return mod.processDSR(tenantId, requestId, requestType);
  } catch (err) {
    logger.warn('[privacy-service] Module DSR processor unavailable', { requestId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get privacy data mapping from the module.
 */
export async function getDataMapping(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/privacy/dist/privacy/services/privacy-data-mapping.service') as any;
    return mod.getDataMapping(tenantId);
  } catch (err) {
    logger.warn('[privacy-service] Module data mapping unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get consent management data from the module.
 */
export async function getConsentStatus(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/privacy/dist/privacy/services/privacy-consent-manager.service') as any;
    return mod.getConsentStatus(tenantId);
  } catch (err) {
    logger.warn('[privacy-service] Module consent manager unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Handle privacy breach from the module.
 */
export async function handleBreach(
  tenantId: string,
  breachData: Record<string, unknown>,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/privacy/dist/privacy/services/privacy-breach-handler.service') as any;
    return mod.handleBreach(tenantId, breachData);
  } catch (err) {
    logger.warn('[privacy-service] Module breach handler unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get privacy dashboard data from the module.
 */
export async function getPrivacyDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/privacy/dist/privacy/services/privacy-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[privacy-service] Module dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get cross-border data transfer status from the module.
 */
export async function getCrossBorderStatus(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/privacy/dist/privacy/services/privacy-cross-border.service') as any;
    return mod.getCrossBorderStatus(tenantId);
  } catch (err) {
    logger.warn('[privacy-service] Module cross-border unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition privacy lifecycle status using module lifecycle service.
 */
export async function transitionStatus(
  tenantId: string,
  assessmentId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/privacy/dist/privacy/services/privacy-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, assessmentId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[privacy-service] Module lifecycle unavailable', { assessmentId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module PIA if available.
 */
async function afterCreate(tenantId: string, record: PrivacyAssessmentRecord): Promise<void> {
  try {
    if (record.type === 'dpia' || record.dpo_review) {
      await runPIA(tenantId, record.assessment_id);
    }
  } catch (err) {
    logger.warn('[privacy-service] Post-create hook failed (non-fatal)', { assessmentId: record.assessment_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-assess when relevant fields change.
 */
async function afterUpdate(tenantId: string, record: PrivacyAssessmentRecord, changedFields: Partial<CreatePrivacyAssessmentInput>): Promise<void> {
  try {
    const relevantFields = ['risk_level', 'status', 'data_category', 'legal_basis'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange) {
      await runPIA(tenantId, record.assessment_id);
    }
  } catch (err) {
    logger.warn('[privacy-service] Post-update hook failed (non-fatal)', { assessmentId: record.assessment_id, error: toErrorMessage(err) });
  }
}

export const PrivacyAssessmentService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  runPIA, processDSR, getDataMapping, getConsentStatus, handleBreach,
  getPrivacyDashboard, getCrossBorderStatus, transitionStatus,
};
