import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface VendorRecord {
  vendor_id: string;
  tenant_id: string;
  name: string;
  description: string;
  category: string;
  status: string;
  risk_tier: string;
  contact_name: string;
  contact_email: string;
  contract_start: string;
  contract_end: string;
  sla_score: number;
  last_assessment_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateVendorInput {
  name: string;
  description?: string;
  category: string;
  status?: string;
  risk_tier?: string;
  contact_name: string;
  contact_email?: string;
  contract_start?: string;
  contract_end?: string;
  sla_score?: number;
  last_assessment_date?: string;
}

export interface ListVendorOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `vendor_id, tenant_id, name, description, category, status, risk_tier, contact_name, contact_email, contract_start, contract_end, sla_score, last_assessment_date, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListVendorOptions = {},
): Promise<{ data: VendorRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.vendors ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.vendors ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as VendorRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[vendor-service] Failed to list vendors', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<VendorRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.vendors WHERE tenant_id = $1 AND vendor_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as VendorRecord) || null;
  } catch (err) {
    logger.error('[vendor-service] Failed to get vendor', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateVendorInput): Promise<VendorRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.vendors (vendor_id, tenant_id, name, description, category, status, risk_tier, contact_name, contact_email, contract_start, contract_end, sla_score, last_assessment_date, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.name ?? null, input.description ?? null, input.category ?? null, input.status ?? null, input.risk_tier ?? null, input.contact_name ?? null, input.contact_email ?? null, input.contract_start ?? null, input.contract_end ?? null, input.sla_score ?? null, input.last_assessment_date ?? null],
    );
    logger.info('[vendor-service] Vendor created', { id, tenantId });
    const created = result.rows[0] as VendorRecord;
    // Wave 2B: fire-and-forget module scoring hook
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[vendor-service] Failed to create vendor', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateVendorInput>): Promise<VendorRecord | null> {
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
      `UPDATE dos.vendors SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND vendor_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[vendor-service] Vendor updated', { id, tenantId });
    const updated = (result.rows[0] as VendorRecord) || null;
    // Wave 2B: fire-and-forget module re-scoring hook
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[vendor-service] Failed to update vendor', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.vendors SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND vendor_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[vendor-service] Vendor soft-deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[vendor-service] Failed to delete vendor', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<VendorRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.vendors SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND vendor_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows.length === 0) return null;
    logger.info('[vendor-service] Vendor restored', { id, tenantId });
    return result.rows[0] as VendorRecord;
  } catch (err) {
    logger.error('[vendor-service] Failed to restore vendor', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateVendorInput[]): Promise<VendorRecord[]> {
  const results: VendorRecord[] = [];
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
      `UPDATE dos.vendors SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND vendor_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    logger.info('[vendor-service] Vendors bulk soft-deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[vendor-service] Failed to bulk delete vendors', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.vendors WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.vendors WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[vendor-service] Failed to get vendor stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/vendor with try/catch guards

/**
 * Score a vendor using the module's scoring engine.
 */
export async function scoreVendor(
  tenantId: string,
  vendorId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/vendor/dist/vendor/services/vendor/vendor-scoring.service') as any;
    return mod.scoreVendor(tenantId, vendorId);
  } catch (err) {
    logger.warn('[vendor-service] Module scoring unavailable', { vendorId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get vendor risk analytics from the module.
 */
export async function getVendorRiskAnalytics(
  tenantId: string,
  vendorId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/vendor/dist/vendor/services/vendor/vendor-risk-analytics.service') as any;
    return mod.getVendorRiskAnalytics(tenantId, vendorId);
  } catch (err) {
    logger.warn('[vendor-service] Module risk analytics unavailable', { vendorId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get vendor cyber rating from the module.
 */
export async function getVendorCyberRating(
  tenantId: string,
  vendorId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/vendor/dist/vendor/services/vendor/vendor-cyber-rating.service') as any;
    return mod.getCyberRating(tenantId, vendorId);
  } catch (err) {
    logger.warn('[vendor-service] Module cyber rating unavailable', { vendorId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get vendor dashboard data from the module.
 */
export async function getVendorDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/vendor/dist/vendor/services/vendor/vendor-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[vendor-service] Module dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition vendor lifecycle status using module lifecycle service.
 */
export async function transitionStatus(
  tenantId: string,
  vendorId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/vendor/dist/vendor/services/vendor-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, vendorId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[vendor-service] Module lifecycle unavailable', { vendorId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Run vendor compliance checks from the module.
 */
export async function runComplianceChecks(
  tenantId: string,
  vendorId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/vendor/dist/vendor/services/vendor/vendor-compliance-checks.service') as any;
    return mod.runComplianceChecks(tenantId, vendorId);
  } catch (err) {
    logger.warn('[vendor-service] Module compliance checks unavailable', { vendorId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module scoring if available.
 */
async function afterCreate(tenantId: string, record: VendorRecord): Promise<void> {
  try {
    if (record.risk_tier) {
      await scoreVendor(tenantId, record.vendor_id);
    }
  } catch (err) {
    logger.warn('[vendor-service] Post-create scoring failed (non-fatal)', { vendorId: record.vendor_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-score when scoring-relevant fields change.
 */
async function afterUpdate(tenantId: string, record: VendorRecord, changedFields: Partial<CreateVendorInput>): Promise<void> {
  try {
    const scoringFields = ['risk_tier', 'sla_score', 'status', 'category'];
    const hasRelevantChange = Object.keys(changedFields).some(k => scoringFields.includes(k));
    if (hasRelevantChange) {
      await scoreVendor(tenantId, record.vendor_id);
    }
  } catch (err) {
    logger.warn('[vendor-service] Post-update re-scoring failed (non-fatal)', { vendorId: record.vendor_id, error: toErrorMessage(err) });
  }
}

export const VendorService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  // Module-delegated methods (Wave 2B)
  scoreVendor, getVendorRiskAnalytics, getVendorCyberRating, getVendorDashboard, transitionStatus, runComplianceChecks,
};
