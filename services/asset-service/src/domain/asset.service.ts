import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface AssetRecord {
  asset_id: string;
  tenant_id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  status: string;
  criticality: string;
  owner_id: string;
  department_id: string;
  location: string;
  ip_address: string;
  os_type: string;
  vendor: string;
  classification: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateAssetInput {
  name: string;
  description?: string;
  type: string;
  category?: string;
  status?: string;
  criticality?: string;
  owner_id?: string;
  department_id?: string;
  location?: string;
  ip_address?: string;
  os_type: string;
  vendor?: string;
  classification?: string;
}

export interface ListAssetOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `asset_id, tenant_id, name, description, type, category, status, criticality, owner_id, department_id, location, ip_address, os_type, vendor, classification, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListAssetOptions = {},
): Promise<{ data: AssetRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.assets ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.assets ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as AssetRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[asset-service] Failed to list assets', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<AssetRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.assets WHERE tenant_id = $1 AND asset_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as AssetRecord) || null;
  } catch (err) {
    logger.error('[asset-service] Failed to get asset', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateAssetInput): Promise<AssetRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.assets (asset_id, tenant_id, name, description, type, category, status, criticality, owner_id, department_id, location, ip_address, os_type, vendor, classification, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.name ?? null, input.description ?? null, input.type ?? null, input.category ?? null, input.status ?? null, input.criticality ?? null, input.owner_id ?? null, input.department_id ?? null, input.location ?? null, input.ip_address ?? null, input.os_type ?? null, input.vendor ?? null, input.classification ?? null],
    );
    logger.info('[asset-service] Asset created', { id, tenantId });
    const created = result.rows[0] as AssetRecord;
    // Wave 2B: fire-and-forget module classification hook
    afterCreate(tenantId, created).catch(() => {});
    return created;
  } catch (err) {
    logger.error('[asset-service] Failed to create asset', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateAssetInput>): Promise<AssetRecord | null> {
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
      `UPDATE dos.assets SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND asset_id = $2 RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[asset-service] Asset updated', { id, tenantId });
    const updated = (result.rows[0] as AssetRecord) || null;
    // Wave 2B: fire-and-forget module re-classification hook
    if (updated) {
      afterUpdate(tenantId, updated, data).catch(() => {});
    }
    return updated;
  } catch (err) {
    logger.error('[asset-service] Failed to update asset', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.assets SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND asset_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[asset-service] Asset deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[asset-service] Failed to delete asset', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.assets SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND asset_id = $2 AND deleted_at IS NOT NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[asset-service] Asset restored', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[asset-service] Failed to restore asset', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateAssetInput[]): Promise<AssetRecord[]> {
  const results: AssetRecord[] = [];
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
      `UPDATE dos.assets SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND asset_id IN (${placeholders}) AND deleted_at IS NULL`,
      [tenantId, ...ids],
    );
    return result.rowCount;
  } catch (err) {
    logger.error('[asset-service] Failed to bulk remove', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.assets WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.assets WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[asset-service] Failed to get asset stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/asset with try/catch guards

/**
 * Classify an asset using the module's classification engine.
 */
export async function classifyAsset(
  tenantId: string,
  assetId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/asset-classification.service') as any;
    return mod.classifyAsset(tenantId, assetId);
  } catch (err) {
    logger.warn('[asset-service] Module classification unavailable', { assetId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Calculate asset criticality using the module's criticality engine.
 */
export async function calculateCriticality(
  tenantId: string,
  assetId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/asset-criticality.service') as any;
    return mod.calculateCriticality(tenantId, assetId);
  } catch (err) {
    logger.warn('[asset-service] Module criticality unavailable', { assetId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get asset dashboard data from the module.
 */
export async function getAssetDashboard(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/asset-dashboard.service') as any;
    return mod.getDashboard(tenantId);
  } catch (err) {
    logger.warn('[asset-service] Module dashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Transition asset lifecycle status using module lifecycle service.
 */
export async function transitionStatus(
  tenantId: string,
  assetId: string,
  targetStatus: string,
  userId: string,
  reason?: string,
): Promise<{ fromStatus: string; toStatus: string } | null> {
  try {
    const lifecycle = require('../../../modules/asset/dist/asset/services/asset-lifecycle.service') as any;
    return lifecycle.transitionStatus(tenantId, assetId, targetStatus, userId, reason);
  } catch (err) {
    logger.warn('[asset-service] Module lifecycle unavailable', { assetId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get asset dependency map from the module.
 */
export async function getDependencyMap(
  tenantId: string,
  assetId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/dependency.service') as any;
    return mod.getDependencyMap(tenantId, assetId);
  } catch (err) {
    logger.warn('[asset-service] Module dependency map unavailable', { assetId, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get service map from the module.
 */
export async function getServiceMap(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/service-map.service') as any;
    return mod.getServiceMap(tenantId);
  } catch (err) {
    logger.warn('[asset-service] Module service map unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * After-create hook: trigger module classification if available.
 */
async function afterCreate(tenantId: string, record: AssetRecord): Promise<void> {
  try {
    if (record.type) {
      await classifyAsset(tenantId, record.asset_id);
    }
  } catch (err) {
    logger.warn('[asset-service] Post-create classification failed (non-fatal)', { assetId: record.asset_id, error: toErrorMessage(err) });
  }
}

/**
 * After-update hook: re-classify when classification-relevant fields change.
 */
async function afterUpdate(tenantId: string, record: AssetRecord, changedFields: Partial<CreateAssetInput>): Promise<void> {
  try {
    const classFields = ['type', 'category', 'criticality', 'classification'];
    const hasRelevantChange = Object.keys(changedFields).some(k => classFields.includes(k));
    if (hasRelevantChange) {
      await classifyAsset(tenantId, record.asset_id);
    }
  } catch (err) {
    logger.warn('[asset-service] Post-update re-classification failed (non-fatal)', { assetId: record.asset_id, error: toErrorMessage(err) });
  }
}

export async function getClassificationHierarchy(
  tenantId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/asset-classification.service') as any;
    return mod.getClassificationHierarchy(tenantId);
  } catch (err) {
    logger.warn('[asset-service] Module classification hierarchy unavailable, using direct DB', { error: toErrorMessage(err) });
    const result = await safeQuery(
      `SELECT DISTINCT classification, type, category, criticality, COUNT(*)::int AS asset_count
       FROM dos.assets WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY classification, type, category, criticality
       ORDER BY classification, type, category`,
      [tenantId],
    ).catch(() => ({ rows: [] }));
    const tree: Record<string, Record<string, Record<string, { criticality: string; count: number }[]>>> = {};
    for (const row of result.rows as any[]) {
      const cls = row.classification || 'unclassified';
      const tp = row.type || 'other';
      const cat = row.category || 'general';
      if (!tree[cls]) tree[cls] = {};
      if (!tree[cls][tp]) tree[cls][tp] = {};
      if (!tree[cls][tp][cat]) tree[cls][tp][cat] = [];
      tree[cls][tp][cat].push({ criticality: row.criticality || 'medium', count: row.asset_count });
    }
    return { hierarchy: tree, totalClassifications: Object.keys(tree).length };
  }
}

export async function updateClassification(
  tenantId: string,
  assetId: string,
  classification: { classification?: string; type?: string; category?: string; criticality?: string },
  userId: string,
): Promise<unknown> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/asset-classification.service') as any;
    return mod.updateClassification(tenantId, assetId, classification, userId);
  } catch (err) {
    logger.warn('[asset-service] Module classification update unavailable, using direct DB', { assetId, error: toErrorMessage(err) });
    const sets: string[] = [];
    const params: unknown[] = [tenantId, assetId];
    let idx = 3;
    for (const [key, val] of Object.entries(classification)) {
      if (val !== undefined && ['classification', 'type', 'category', 'criticality'].includes(key)) {
        sets.push(`${key} = $${idx++}`);
        params.push(val);
      }
    }
    if (sets.length === 0) return null;
    sets.push('updated_at = NOW()');
    const result = await safeQuery(
      `UPDATE dos.assets SET ${sets.join(', ')} WHERE tenant_id = $1 AND asset_id = $2 AND deleted_at IS NULL RETURNING *`,
      params,
    ).catch(() => ({ rows: [] }));
    return result.rows[0] ?? null;
  }
}

export async function bulkClassify(
  tenantId: string,
  assetIds: string[],
  classification: { classification?: string; type?: string; category?: string; criticality?: string },
  userId: string,
): Promise<{ updated: number }> {
  try {
    const mod = require('../../../modules/asset/dist/asset/services/asset-classification.service') as any;
    return mod.bulkClassify(tenantId, assetIds, classification, userId);
  } catch (err) {
    logger.warn('[asset-service] Module bulk classify unavailable, using direct DB', { error: toErrorMessage(err) });
    const sets: string[] = [];
    const params: unknown[] = [tenantId];
    let idx = 2;
    for (const [key, val] of Object.entries(classification)) {
      if (val !== undefined && ['classification', 'type', 'category', 'criticality'].includes(key)) {
        sets.push(`${key} = $${idx++}`);
        params.push(val);
      }
    }
    if (sets.length === 0) return { updated: 0 };
    sets.push('updated_at = NOW()');
    const placeholders = assetIds.map((_, i) => `$${idx + i}`).join(', ');
    params.push(...assetIds);
    const result = await safeQuery(
      `UPDATE dos.assets SET ${sets.join(', ')} WHERE tenant_id = $1 AND asset_id IN (${placeholders}) AND deleted_at IS NULL`,
      params,
    ).catch(() => ({ rowCount: 0 }));
    return { updated: result.rowCount };
  }
}

export const AssetService = {
  list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats,
  classifyAsset, calculateCriticality, getAssetDashboard, transitionStatus, getDependencyMap, getServiceMap,
  getClassificationHierarchy, updateClassification, bulkClassify,
};
