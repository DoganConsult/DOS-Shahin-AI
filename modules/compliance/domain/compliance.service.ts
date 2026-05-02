import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ComplianceRecord {
  requirement_id: string;
  tenant_id: string;
  framework_id: string;
  framework_name: string;
  control_ref: string;
  title: string;
  description: string;
  status: string;
  evidence_status: string;
  owner_id: string;
  due_date: string | null;
  last_assessed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateComplianceInput {
  framework_id?: string;
  framework_name: string;
  control_ref?: string;
  title: string;
  description?: string;
  status?: string;
  evidence_status?: string;
  owner_id?: string;
  due_date?: string;
  last_assessed_at?: string;
}

export interface ListComplianceOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `requirement_id, tenant_id, framework_id, framework_name, control_ref, title, description, status, evidence_status, owner_id, due_date, last_assessed_at, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListComplianceOptions = {},
): Promise<{ data: ComplianceRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.compliance_requirements ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.compliance_requirements ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as ComplianceRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to list compliances', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<ComplianceRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.compliance_requirements WHERE tenant_id = $1 AND requirement_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as ComplianceRecord) || null;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to get compliance', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateComplianceInput): Promise<ComplianceRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.compliance_requirements (requirement_id, tenant_id, framework_id, framework_name, control_ref, title, description, status, evidence_status, owner_id, due_date, last_assessed_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.framework_id ?? null, input.framework_name ?? null, input.control_ref ?? null, input.title ?? null, input.description ?? null, input.status ?? null, input.evidence_status ?? null, input.owner_id ?? null, input.due_date ?? null, input.last_assessed_at ?? null],
    );
    logger.info('[compliance-controls-service] Compliance created', { id, tenantId });
    const created = result.rows[0] as ComplianceRecord;
    // Wave 2B: fire-and-forget module snapshot hook
    afterComplianceCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to create compliance', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateComplianceInput>): Promise<ComplianceRecord | null> {
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
      `UPDATE dos.compliance_requirements SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND requirement_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[compliance-controls-service] Compliance updated', { id, tenantId });
    const updated = (result.rows[0] as ComplianceRecord) || null;
    // Wave 2B: fire-and-forget module drift hook
    if (updated) {
      afterComplianceUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to update compliance', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.compliance_requirements SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND requirement_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[compliance-controls-service] Compliance deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to delete compliance', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.compliance_requirements SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND requirement_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[compliance-controls-service] Compliance restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to restore compliance', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateComplianceInput[]): Promise<ComplianceRecord[]> {
  const results: ComplianceRecord[] = [];
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
      `UPDATE dos.compliance_requirements SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND requirement_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.compliance_requirements WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.compliance_requirements WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[compliance-controls-service] Failed to get compliance stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/compliance with try/catch guards

/**
 * Detect compliance drift by comparing current state to last snapshot.
 */
export async function detectDrift(tenantId: string): Promise<unknown> {
  try {
    const drift = require(
      '../../../modules/compliance/dist/compliance/services/compliance/automation/compliance-drift-detection.service'
    );
    return drift.detectComplianceDrift(tenantId);
  } catch (err) {
    logger.warn('[compliance-controls-service] Module drift detection unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Capture a compliance overview snapshot for drift tracking.
 */
export async function captureSnapshot(tenantId: string): Promise<string | null> {
  try {
    const drift = require(
      '../../../modules/compliance/dist/compliance/services/compliance/automation/compliance-drift-detection.service'
    );
    return drift.captureComplianceOverviewSnapshot(tenantId);
  } catch (err) {
    logger.warn('[compliance-controls-service] Module snapshot capture unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Run continuous attestation check using module service.
 */
export async function runContinuousAttestationCheck(tenantId: string): Promise<unknown> {
  try {
    const attestation = require(
      '../../../modules/compliance/dist/compliance/services/continuous-attestation.service'
    );
    return attestation.runContinuousAttestationCheck(tenantId);
  } catch (err) {
    logger.warn('[compliance-controls-service] Module attestation check unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get regulatory delta analysis from module.
 */
export async function getRegulatoryDelta(tenantId: string): Promise<unknown> {
  try {
    const delta = require(
      '../../../modules/compliance/dist/compliance/services/regulatory-delta.service'
    );
    return delta;
  } catch (err) {
    logger.warn('[compliance-controls-service] Module regulatory delta unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger drift snapshot after new requirement created.
 */
async function afterComplianceCreate(tenantId: string, _record: ComplianceRecord): Promise<void> {
  try {
    await captureSnapshot(tenantId);
  } catch (err) {
    logger.warn('[compliance-controls-service] Post-create snapshot failed (non-fatal)', { error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: check for drift when compliance status changes.
 */
async function afterComplianceUpdate(tenantId: string, _record: ComplianceRecord, changedFields: Partial<CreateComplianceInput>): Promise<void> {
  try {
    const relevantFields = ['status', 'evidence_status'];
    const hasRelevantChange = Object.keys(changedFields).some(k => relevantFields.includes(k));
    if (hasRelevantChange) {
      await detectDrift(tenantId);
    }
  } catch (err) {
    logger.warn('[compliance-controls-service] Post-update drift check failed (non-fatal)', { error: toErrorMessage(err) });
  }
}

export const ComplianceService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  detectDrift, captureSnapshot, runContinuousAttestationCheck, getRegulatoryDelta,
};
