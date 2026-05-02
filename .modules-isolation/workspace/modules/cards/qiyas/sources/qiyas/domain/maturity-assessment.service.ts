import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface MaturityAssessmentRecord {
  assessment_id: string;
  tenant_id: string;
  title: string;
  description: string;
  framework: string;
  domain_area: string;
  status: string;
  current_level: number;
  target_level: number;
  assessor_id: string;
  assessment_date: string | null;
  next_review_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateMaturityAssessmentInput {
  title: string;
  description?: string;
  framework: string;
  domain_area?: string;
  status?: string;
  current_level?: number;
  target_level?: number;
  assessor_id?: string;
  assessment_date?: string;
  next_review_date?: string;
}

export interface ListMaturityAssessmentOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `assessment_id, tenant_id, title, description, framework, domain_area, status, current_level, target_level, assessor_id, assessment_date, next_review_date, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListMaturityAssessmentOptions = {},
): Promise<{ data: MaturityAssessmentRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.maturity_assessments ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.maturity_assessments ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as MaturityAssessmentRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to list maturity-assessments', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<MaturityAssessmentRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.maturity_assessments WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as MaturityAssessmentRecord) || null;
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to get maturity-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateMaturityAssessmentInput): Promise<MaturityAssessmentRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.maturity_assessments (assessment_id, tenant_id, title, description, framework, domain_area, status, current_level, target_level, assessor_id, assessment_date, next_review_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.framework ?? null, input.domain_area ?? null, input.status ?? null, input.current_level ?? null, input.target_level ?? null, input.assessor_id ?? null, input.assessment_date ?? null, input.next_review_date ?? null],
    );
    logger.info('[qiyas-journey-service] MaturityAssessment created', { id, tenantId });
    return result.rows[0] as MaturityAssessmentRecord;
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to create maturity-assessment', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateMaturityAssessmentInput>): Promise<MaturityAssessmentRecord | null> {
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
      `UPDATE dos.maturity_assessments SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[qiyas-journey-service] MaturityAssessment updated', { id, tenantId });
    return (result.rows[0] as MaturityAssessmentRecord) || null;
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to update maturity-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.maturity_assessments SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[qiyas-journey-service] MaturityAssessment soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to delete maturity-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<MaturityAssessmentRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.maturity_assessments SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows.length === 0) return null;
    logger.info('[qiyas-journey-service] MaturityAssessment restored', { id, tenantId });
    return result.rows[0] as MaturityAssessmentRecord;
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to restore maturity-assessment', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateMaturityAssessmentInput[]): Promise<MaturityAssessmentRecord[]> {
  const results: MaturityAssessmentRecord[] = [];
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
      `UPDATE dos.maturity_assessments SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND assessment_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    logger.info('[qiyas-journey-service] MaturityAssessments bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to bulk delete maturity-assessments', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.maturity_assessments WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.maturity_assessments WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[qiyas-journey-service] Failed to get maturity-assessment stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/qiyas with try/catch guards

/**
 * Compute assessment scores via qiyas scoring engine.
 */
export async function computeAssessmentScore(tenantId: string, assessmentId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/qiyas/dist/qiyas/services/qiyas-scoring.service') as any;
    return mod.computeAssessmentScore(tenantId, assessmentId);
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module computeAssessmentScore unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Start or resume an assessment via the assessment engine.
 */
export async function startAssessment(tenantId: string, data: Record<string, unknown>): Promise<unknown> {
  try {
    const mod = require('../../../modules/qiyas/dist/qiyas/services/qiyas-assessment-engine.service') as any;
    return mod.startAssessment(tenantId, data);
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module startAssessment unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get maturity model level definitions.
 */
export async function getMaturityLevels(): Promise<unknown> {
  try {
    const mod = require('../../../modules/qiyas/dist/qiyas/services/qiyas-maturity-model.service') as any;
    return mod.getMaturityLevels();
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module getMaturityLevels unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get question bank for an assessment framework.
 */
export async function getQuestionBank(tenantId: string, framework: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/qiyas/dist/qiyas/services/qiyas-question-bank.service') as any;
    return mod.getQuestionBank(tenantId, framework);
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module getQuestionBank unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get benchmark data for comparison.
 */
export async function getQiyasBenchmark(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/qiyas/dist/qiyas/services/qiyas-benchmark.service') as any;
    return mod.getQiyasBenchmark(tenantId);
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module getQiyasBenchmark unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Build assessment report.
 */
export async function buildReport(tenantId: string, assessmentId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/qiyas/dist/qiyas/services/qiyas-report-builder.service') as any;
    return mod.buildReport(tenantId, assessmentId);
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module buildReport unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get trend analysis for assessment scores.
 */
export async function getTrendAnalysis(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/qiyas/dist/qiyas/services/qiyas-trend-analysis.service') as any;
    return mod.getTrendAnalysis(tenantId);
  } catch (err) {
    logger.warn('[qiyas-journey-service] Module getTrendAnalysis unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

export const MaturityAssessmentService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, computeAssessmentScore, startAssessment, getMaturityLevels, getQuestionBank, getQiyasBenchmark, buildReport, getTrendAnalysis };
