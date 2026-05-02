import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface ProductLicenseRecord {
  license_id: string;
  tenant_id: string;
  product_code: string;
  plan: string;
  status: string;
  seat_count: number;
  features: unknown;
  valid_from: string;
  valid_until: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateProductLicenseInput {
  product_code: string;
  plan: string;
  status?: string;
  seat_count?: number;
  features?: unknown;
  valid_from?: string;
  valid_until?: string;
}

export interface ListProductLicenseOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `license_id, tenant_id, product_code, plan, status, seat_count, features, valid_from, valid_until, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListProductLicenseOptions = {},
): Promise<{ data: ProductLicenseRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.product_licenses ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.product_licenses ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as ProductLicenseRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[platform-product-service] Failed to list product-licenses', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<ProductLicenseRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.product_licenses WHERE tenant_id = $1 AND license_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as ProductLicenseRecord) || null;
  } catch (err) {
    logger.error('[platform-product-service] Failed to get product-license', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateProductLicenseInput): Promise<ProductLicenseRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.product_licenses (license_id, tenant_id, product_code, plan, status, seat_count, features, valid_from, valid_until, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.product_code ?? null, input.plan ?? null, input.status ?? null, input.seat_count ?? null, input.features ?? null, input.valid_from ?? null, input.valid_until ?? null],
    );
    logger.info('[platform-product-service] ProductLicense created', { id, tenantId });
    return result.rows[0] as ProductLicenseRecord;
  } catch (err) {
    logger.error('[platform-product-service] Failed to create product-license', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateProductLicenseInput>): Promise<ProductLicenseRecord | null> {
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
      `UPDATE dos.product_licenses SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND license_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[platform-product-service] ProductLicense updated', { id, tenantId });
    return (result.rows[0] as ProductLicenseRecord) || null;
  } catch (err) {
    logger.error('[platform-product-service] Failed to update product-license', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.product_licenses SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND license_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[platform-product-service] ProductLicense deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[platform-product-service] Failed to delete product-license', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<ProductLicenseRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.product_licenses SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND license_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows[0]) {
      logger.info('[platform-product-service] ProductLicense restored', { id, tenantId });
      return result.rows[0] as ProductLicenseRecord;
    }
    return null;
  } catch (err) {
    logger.error('[platform-product-service] Failed to restore product-license', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateProductLicenseInput[]): Promise<ProductLicenseRecord[]> {
  const results: ProductLicenseRecord[] = [];
  for (const item of items) {
    results.push(await create(tenantId, item));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.product_licenses SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND license_id = ANY($2) AND deleted_at IS NULL`,
      [tenantId, ids],
    );
    logger.info('[platform-product-service] ProductLicenses bulk deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[platform-product-service] Failed to bulk delete product-licenses', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.product_licenses WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.product_licenses WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[platform-product-service] Failed to get product-license stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

export const ProductLicenseService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats };
