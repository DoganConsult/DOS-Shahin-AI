import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface TrainingProgramRecord {
  program_id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  type: string;
  status: string;
  duration_minutes: number;
  passing_score: number;
  max_attempts: number;
  mandatory: boolean;
  target_audience: string;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateTrainingProgramInput {
  title: string;
  description?: string;
  category: string;
  type?: string;
  status?: string;
  duration_minutes?: number;
  passing_score?: number;
  max_attempts?: number;
  mandatory?: boolean;
  target_audience?: string;
  owner_id?: string;
}

export interface ListTrainingProgramOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `program_id, tenant_id, title, description, category, type, status, duration_minutes, passing_score, max_attempts, mandatory, target_audience, owner_id, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListTrainingProgramOptions = {},
): Promise<{ data: TrainingProgramRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.training_programs ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.training_programs ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as TrainingProgramRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[training-service] Failed to list training-programs', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<TrainingProgramRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.training_programs WHERE tenant_id = $1 AND program_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as TrainingProgramRecord) || null;
  } catch (err) {
    logger.error('[training-service] Failed to get training-program', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateTrainingProgramInput): Promise<TrainingProgramRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.training_programs (program_id, tenant_id, title, description, category, type, status, duration_minutes, passing_score, max_attempts, mandatory, target_audience, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.category ?? null, input.type ?? null, input.status ?? null, input.duration_minutes ?? null, input.passing_score ?? null, input.max_attempts ?? null, input.mandatory ?? null, input.target_audience ?? null, input.owner_id ?? null],
    );
    logger.info('[training-service] TrainingProgram created', { id, tenantId });
    const created = result.rows[0] as TrainingProgramRecord;
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[training-service] Failed to create training-program', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateTrainingProgramInput>): Promise<TrainingProgramRecord | null> {
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
      `UPDATE dos.training_programs SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND program_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[training-service] TrainingProgram updated', { id, tenantId });
    const updated = (result.rows[0] as TrainingProgramRecord) || null;
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[training-service] Failed to update training-program', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.training_programs SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND program_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[training-service] TrainingProgram soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[training-service] Failed to delete training-program', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<TrainingProgramRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.training_programs SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND program_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows.length === 0) return null;
    logger.info('[training-service] TrainingProgram restored', { id, tenantId });
    return result.rows[0] as TrainingProgramRecord;
  } catch (err) {
    logger.error('[training-service] Failed to restore training-program', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateTrainingProgramInput[]): Promise<TrainingProgramRecord[]> {
  const results: TrainingProgramRecord[] = [];
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
      `UPDATE dos.training_programs SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND program_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    logger.info('[training-service] TrainingPrograms bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[training-service] Failed to bulk delete training-programs', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.training_programs WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.training_programs WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[training-service] Failed to get training-program stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/training with try/catch guards

/**
 * Get training dashboard data from the module.
 */
export async function getTrainingDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/training-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[training-service] Module dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get training gap analysis from the module's gap orchestrator.
 */
export async function getTrainingGapAnalysis(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/training-gap-orchestrator.service') as any;
    return mod.getGapAnalysis(tenantId);
  } catch (err) {
    logger.warn('[training-service] Module gap analysis unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get questionnaire engine data from the module.
 */
export async function getQuestionnaireEngine(
  tenantId: string,
  programId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/questionnaire-engine.service') as any;
    return mod.getQuestionnaire(tenantId, programId);
  } catch (err) {
    logger.warn('[training-service] Module questionnaire engine unavailable', { programId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get maturity score from the module.
 */
export async function getMaturityScore(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/questionnaire-maturity-scorer.service') as any;
    return mod.getMaturityScore(tenantId);
  } catch (err) {
    logger.warn('[training-service] Module maturity scorer unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition training lifecycle status using module lifecycle service.
 */
export async function transitionStatus(
  tenantId: string,
  programId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/training/dist/backend/training/services/training-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, programId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[training-service] Module lifecycle unavailable', { programId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module gap analysis if available.
 */
async function afterCreate(tenantId: string, record: TrainingProgramRecord): Promise<void> {
  try {
    if (record.mandatory) {
      await getTrainingGapAnalysis(tenantId);
    }
  } catch (err) {
    logger.warn('[training-service] Post-create hook failed (non-fatal)', { programId: record.program_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-analyze when relevant fields change.
 */
async function afterUpdate(tenantId: string, record: TrainingProgramRecord, changedFields: Partial<CreateTrainingProgramInput>): Promise<void> {
  try {
    const relevantFields = ['status', 'mandatory', 'category'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange) {
      await getTrainingGapAnalysis(tenantId);
    }
  } catch (err) {
    logger.warn('[training-service] Post-update hook failed (non-fatal)', { programId: record.program_id, error: toErrorMessage(err) });
  }
}

export async function enrollUser(
  tenantId: string,
  programId: string,
  userId: string,
  enrolledBy: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/training-enrollment.service') as any;
    return mod.enrollUser(tenantId, programId, userId, enrolledBy);
  } catch (err) {
    logger.warn('[training-service] Module enrollment unavailable, using direct DB', { programId, error: toErrorMessage(err) });
    const id = randomUUID();
    const result = await safeQuery(
      `INSERT INTO dos.training_enrollments (enrollment_id, tenant_id, program_id, user_id, status, enrolled_by, enrolled_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'enrolled', $5, NOW(), NOW(), NOW())
       ON CONFLICT (tenant_id, program_id, user_id) WHERE deleted_at IS NULL DO UPDATE SET status = 'enrolled', updated_at = NOW()
       RETURNING *`,
      [id, tenantId, programId, userId, enrolledBy],
    ).catch(() => ({ rows: [] }));
    return result.rows[0] ?? { enrollment_id: id, status: 'enrolled' };
  }
}

export async function getEnrollments(
  tenantId: string,
  programId: string,
): Promise<unknown[]> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/training-enrollment.service') as any;
    return mod.getEnrollments(tenantId, programId);
  } catch (err) {
    logger.warn('[training-service] Module enrollment list unavailable, using direct DB', { programId, error: toErrorMessage(err) });
    const result = await safeQuery(
      `SELECT * FROM dos.training_enrollments WHERE tenant_id = $1 AND program_id = $2 AND deleted_at IS NULL ORDER BY enrolled_at DESC`,
      [tenantId, programId],
    ).catch(() => ({ rows: [] }));
    return result.rows;
  }
}

export async function updateProgress(
  tenantId: string,
  programId: string,
  userId: string,
  progress: number,
  completedModules?: string[],
): Promise<unknown> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/training-progress.service') as any;
    return mod.updateProgress(tenantId, programId, userId, progress, completedModules);
  } catch (err) {
    logger.warn('[training-service] Module progress unavailable, using direct DB', { programId, error: toErrorMessage(err) });
    const status = progress >= 100 ? 'completed' : 'in_progress';
    const result = await safeQuery(
      `UPDATE dos.training_enrollments SET progress = $1, status = $2, completed_modules = COALESCE($3::jsonb, completed_modules), updated_at = NOW(), completed_at = CASE WHEN $2 = 'completed' THEN NOW() ELSE completed_at END
       WHERE tenant_id = $4 AND program_id = $5 AND user_id = $6 AND deleted_at IS NULL
       RETURNING *`,
      [progress, status, completedModules ? JSON.stringify(completedModules) : null, tenantId, programId, userId],
    ).catch(() => ({ rows: [] }));
    return result.rows[0] ?? null;
  }
}

export async function getCompletionStats(
  tenantId: string,
  programId?: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/training/dist/backend/training/services/training-completion-tracker.service') as any;
    return mod.getCompletionStats(tenantId, programId);
  } catch (err) {
    logger.warn('[training-service] Module completion tracker unavailable, using direct DB', { error: toErrorMessage(err) });
    const condition = programId ? 'AND program_id = $2' : '';
    const params: unknown[] = programId ? [tenantId, programId] : [tenantId];
    const result = await safeQuery(
      `SELECT
         COUNT(*)::int AS total_enrollments,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
         COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
         COUNT(*) FILTER (WHERE status = 'enrolled')::int AS not_started,
         ROUND(AVG(COALESCE(progress, 0))::numeric, 1) AS avg_progress
       FROM dos.training_enrollments WHERE tenant_id = $1 ${condition} AND deleted_at IS NULL`,
      params,
    ).catch(() => ({ rows: [{ total_enrollments: 0, completed: 0, in_progress: 0, not_started: 0, avg_progress: 0 }] }));
    return result.rows[0];
  }
}

export const TrainingProgramService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  getTrainingDashboard, getTrainingGapAnalysis, getQuestionnaireEngine, getMaturityScore, transitionStatus,
  enrollUser, getEnrollments, updateProgress, getCompletionStats,
};
