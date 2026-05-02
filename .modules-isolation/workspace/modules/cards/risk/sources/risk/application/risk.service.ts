import { randomUUID } from 'node:crypto';
import { safeQuery, tenantSchema } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

function tbl(tenantId: string): string {
  return `"${tenantSchema(tenantId)}"."risks"`;
}

export interface RiskRecord {
  risk_id: string;
  tenant_id: string;
  title: string;
  description: string;
  category: string;
  likelihood: string;
  impact: string;
  risk_score: number;
  status: string;
  owner_id: string;
  mitigation_plan: string;
  residual_risk: string;
  review_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateRiskInput {
  title: string;
  description?: string;
  category: string;
  likelihood?: string;
  impact?: string;
  risk_score?: number;
  status?: string;
  owner_id?: string;
  mitigation_plan?: string;
  residual_risk?: string;
  review_date?: string;
}

export interface ListRiskOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `risk_id, tenant_id, title, description, category, likelihood, impact, risk_score, status, owner_id, mitigation_plan, residual_risk, review_date, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListRiskOptions = {},
): Promise<{ data: RiskRecord[]; total: number; page: number; pageSize: number }> {
  const page = Math.max(1, options.page || 1);
  const pageSize = Math.min(100, Math.max(1, options.pageSize || 25));
  const offset = (page - 1) * pageSize;
  const table = tbl(tenantId);
  const conditions: string[] = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;

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
      `SELECT COUNT(*)::int AS total FROM ${table} ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM ${table} ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
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
      `SELECT ${COLUMNS} FROM dos.risks WHERE tenant_id = $1 AND risk_id = $2 AND deleted_at IS NULL`,
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
  try {
    const result = await safeQuery(
      `INSERT INTO dos.risks (risk_id, tenant_id, title, description, category, likelihood, impact, risk_score, status, owner_id, mitigation_plan, residual_risk, review_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.category ?? null, input.likelihood ?? null, input.impact ?? null, input.risk_score ?? null, input.status ?? null, input.owner_id ?? null, input.mitigation_plan ?? null, input.residual_risk ?? null, input.review_date ?? null],
    );
    logger.info('[risk-incident-service] Risk created', { id, tenantId });
    const created = result.rows[0] as RiskRecord;
    // Wave 2B: fire-and-forget module scoring hook
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to create risk', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateRiskInput>): Promise<RiskRecord | null> {
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
      `UPDATE dos.risks SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND risk_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[risk-incident-service] Risk updated', { id, tenantId });
    const updated = (result.rows[0] as RiskRecord) || null;
    // Wave 2B: fire-and-forget module re-scoring hook
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to update risk', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.risks SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND risk_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[risk-incident-service] Risk deleted', { id, tenantId });
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
    if (result.rowCount > 0) {
      logger.info('[risk-incident-service] Risk restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[risk-incident-service] Failed to restore risk', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateRiskInput[]): Promise<RiskRecord[]> {
  const results: RiskRecord[] = [];
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
      `UPDATE dos.risks SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND risk_id IN (${placeholders}) AND deleted_at IS NULL`,
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
      `SELECT COUNT(*)::int AS total FROM dos.risks WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.risks WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[risk-incident-service] Failed to get risk stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/risk with try/catch guards

/**
 * Score a risk using the module's scoring engine.
 * Falls back gracefully if the module is unavailable.
 */
export async function scoreRisk(
  tenantId: string,
  riskId: string,
  dimensionScores?: Array<{ name: string; score: number }>,
  modelId?: string,
): Promise<{ compositeScore: number; zone: string; thresholdCrossing: unknown } | null> {
  try {
    const scoring = require('../../../modules/risk/dist/risk/services/scoring/risk-scoring.service') as any;
    if (!dimensionScores || !modelId) {
      // Use default model
      const models = await scoring.getRiskModels(tenantId);
      const model = models[0];
      if (!model) return null;
      const defaultScores = model.dimensions.map((d: { name: string; scale: { max?: number } }) => ({
        name: d.name,
        score: (d.scale.max ?? 5) / 2,
      }));
      return scoring.scoreRisk(tenantId, riskId, dimensionScores || defaultScores, modelId || model.modelId);
    }
    return scoring.scoreRisk(tenantId, riskId, dimensionScores, modelId);
  } catch (err) {
    logger.warn('[risk-incident-service] Module scoring unavailable, skipping', { riskId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get the FAIR financial quantification for a risk.
 */
export async function getFairExposure(
  tenantId: string,
  riskId: string,
): Promise<unknown> {
  try {
    const fair = require('../../../modules/risk/dist/risk/services/quantification/fair-financial-quantification.service') as any;
    return fair.getFairExposure(tenantId, riskId);
  } catch (err) {
    logger.warn('[risk-incident-service] Module FAIR quantification unavailable', { riskId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Calculate FAIR financial exposure for a risk.
 */
export async function calculateFairExposure(
  tenantId: string,
  riskId: string,
  options?: { threatEventFrequency?: number; vulnerability?: number; useAIEnhancement?: boolean },
): Promise<unknown> {
  try {
    const fair = require('../../../modules/risk/dist/risk/services/quantification/fair-financial-quantification.service') as any;
    return fair.calculateFairExposure(tenantId, riskId, options);
  } catch (err) {
    logger.warn('[risk-incident-service] Module FAIR calculation unavailable', { riskId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get the risk posture report from the scoring module.
 */
export async function getRiskPosture(tenantId: string): Promise<unknown> {
  try {
    const scoring = require('../../../modules/risk/dist/risk/services/scoring/risk-scoring.service') as any;
    return scoring.getRiskPosture(tenantId);
  } catch (err) {
    logger.warn('[risk-incident-service] Module risk posture unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition risk lifecycle status using module lifecycle service.
 */
export async function transitionStatus(
  tenantId: string,
  riskId: string,
  targetStatus: string,
  userId: string,
  entityType: 'risk' | 'assessment' | 'treatment' | 'kri' = 'risk',
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/risk/dist/risk/services/risk-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, riskId, targetStatus, userId, entityType, reason);
  } catch (err) {
    logger.warn('[risk-incident-service] Module lifecycle unavailable', { riskId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module scoring if available.
 */
async function afterCreate(tenantId: string, record: RiskRecord): Promise<void> {
  try {
    if (record.likelihood && record.impact) {
      await scoreRisk(tenantId, record.risk_id);
    }
  } catch (err) {
    logger.warn('[risk-incident-service] Post-create scoring failed (non-fatal)', { riskId: record.risk_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-score when scoring-relevant fields change.
 */
async function afterUpdate(tenantId: string, record: RiskRecord, changedFields: Partial<CreateRiskInput>): Promise<void> {
  try {
    const scoringFields = ['likelihood', 'impact', 'category', 'risk_score'];
    const hasRelevantChange = Object.keys(changedFields).some(k => scoringFields.includes(k));
    if (hasRelevantChange) {
      await scoreRisk(tenantId, record.risk_id);
    }
  } catch (err) {
    logger.warn('[risk-incident-service] Post-update re-scoring failed (non-fatal)', { riskId: record.risk_id, error: toErrorMessage(err) });
  }
}

export const RiskService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  scoreRisk, getFairExposure, calculateFairExposure, getRiskPosture, transitionStatus,
};
