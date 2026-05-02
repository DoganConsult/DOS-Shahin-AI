import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface PolicyRecord {
  policy_id: string;
  tenant_id: string;
  title: string;
  description: string;
  version: string;
  status: string;
  category: string;
  owner_id: string;
  approver_id: string;
  effective_date: string | null;
  review_date: string | null;
  content: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreatePolicyInput {
  title: string;
  description?: string;
  version?: string;
  status?: string;
  category: string;
  owner_id?: string;
  approver_id?: string;
  effective_date?: string;
  review_date?: string;
  content?: string;
}

export interface ListPolicyOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `policy_id, tenant_id, title, description, version, status, category, owner_id, approver_id, effective_date, review_date, content, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListPolicyOptions = {},
): Promise<{ data: PolicyRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.policies ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.policies ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as PolicyRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[governance-policy-service] Failed to list policys', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<PolicyRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.policies WHERE tenant_id = $1 AND policy_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as PolicyRecord) || null;
  } catch (err) {
    logger.error('[governance-policy-service] Failed to get policy', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreatePolicyInput): Promise<PolicyRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.policies (policy_id, tenant_id, title, description, version, status, category, owner_id, approver_id, effective_date, review_date, content, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.title ?? null, input.description ?? null, input.version ?? null, input.status ?? null, input.category ?? null, input.owner_id ?? null, input.approver_id ?? null, input.effective_date ?? null, input.review_date ?? null, input.content ?? null],
    );
    logger.info('[governance-policy-service] Policy created', { id, tenantId });
    const created = result.rows[0] as PolicyRecord;
    // Wave 2B: fire-and-forget module maturity hook
    afterPolicyCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[governance-policy-service] Failed to create policy', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreatePolicyInput>): Promise<PolicyRecord | null> {
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
      `UPDATE dos.policies SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND policy_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[governance-policy-service] Policy updated', { id, tenantId });
    const updated = (result.rows[0] as PolicyRecord) || null;
    // Wave 2B: fire-and-forget module maturity hook
    if (updated) {
      afterPolicyUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[governance-policy-service] Failed to update policy', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.policies SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND policy_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[governance-policy-service] Policy deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[governance-policy-service] Failed to delete policy', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<PolicyRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.policies SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND policy_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows[0]) {
      logger.info('[governance-policy-service] Policy restored', { id, tenantId });
      return result.rows[0] as PolicyRecord;
    }
    return null;
  } catch (err) {
    logger.error('[governance-policy-service] Failed to restore policy', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreatePolicyInput[]): Promise<PolicyRecord[]> {
  const results: PolicyRecord[] = [];
  for (const item of items) {
    results.push(await create(tenantId, item));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.policies SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND policy_id = ANY($2) AND deleted_at IS NULL`,
      [tenantId, ids],
    );
    logger.info('[governance-policy-service] Policies bulk deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[governance-policy-service] Failed to bulk delete policies', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.policies WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.policies WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[governance-policy-service] Failed to get policy stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/governance with try/catch guards

/**
 * Transition policy lifecycle status using module lifecycle service.
 */
export async function transitionStatus(
  tenantId: string,
  policyId: string,
  targetStatus: string,
  userId: string,
  entityType: 'policy' | 'framework' | 'assessment' = 'policy',
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require(
      '../../../modules/governance/dist/governance/services/governance-lifecycle.service'
    );
    return lifecycle.transitionStatus(tenantId, policyId, targetStatus, userId, entityType, reason);
  } catch (err) {
    logger.warn('[governance-policy-service] Module lifecycle unavailable', { policyId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Auto-assess governance maturity from platform data.
 */
export async function autoAssessMaturity(
  tenantId: string,
  frameworkCode?: string,
): Promise<unknown> {
  try {
    const maturity = require(
      '../../../modules/governance/dist/governance/services/governance/intelligence/governance-maturity-auto-assessment.service'
    );
    return maturity.autoAssessMaturity(tenantId, frameworkCode);
  } catch (err) {
    logger.warn('[governance-policy-service] Module maturity assessment unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get governance health score from module.
 */
export async function getGovernanceHealth(tenantId: string): Promise<unknown> {
  try {
    const health = require(
      '../../../modules/governance/dist/governance/services/governance/governance-health.service'
    );
    return health;
  } catch (err) {
    logger.warn('[governance-policy-service] Module governance health unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get lifecycle state for a governance entity.
 */
export async function getLifecycleState(
  tenantId: string,
  entityId: string,
): Promise<unknown> {
  try {
    const lifecycle = require(
      '../../../modules/governance/dist/governance/services/governance-lifecycle.service'
    );
    return lifecycle.getLifecycleState(tenantId, entityId);
  } catch (err) {
    logger.warn('[governance-policy-service] Module lifecycle state unavailable', { entityId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger maturity recalculation.
 */
async function afterPolicyCreate(tenantId: string, _record: PolicyRecord): Promise<void> {
  try {
    await autoAssessMaturity(tenantId);
  } catch {
    // Non-fatal: module may not be available
  }
}

/**
 * After-update hook: recalculate maturity when policy status changes.
 */
async function afterPolicyUpdate(tenantId: string, _record: PolicyRecord, changedFields: Partial<CreatePolicyInput>): Promise<void> {
  try {
    const relevantFields = ['status', 'version', 'effective_date'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange) {
      await autoAssessMaturity(tenantId);
    }
  } catch {
    // Non-fatal: module may not be available
  }
}

export const PolicyService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  transitionStatus, autoAssessMaturity, getGovernanceHealth, getLifecycleState,
};
