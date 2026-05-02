import { randomUUID } from 'node:crypto';
import { safeQuery } from '@dos/db';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/types/errors';

export interface IntegrationRecord {
  integration_id: string;
  tenant_id: string;
  name: string;
  description: string;
  type: string;
  provider: string;
  status: string;
  config: unknown;
  credentials_ref: string;
  sync_frequency: string;
  last_sync_at: string | null;
  error_count: number;
  owner_id: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreateIntegrationInput {
  name: string;
  description?: string;
  type: string;
  provider: string;
  status?: string;
  config?: unknown;
  credentials_ref?: string;
  sync_frequency?: string;
  last_sync_at?: string;
  error_count?: number;
  owner_id?: string;
}

export interface ListIntegrationOptions {
  page?: number;
  pageSize?: number;
  status?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

const COLUMNS = `integration_id, tenant_id, name, description, type, provider, status, config, credentials_ref, sync_frequency, last_sync_at, error_count, owner_id, created_at, updated_at`;

export async function list(
  tenantId: string,
  options: ListIntegrationOptions = {},
): Promise<{ data: IntegrationRecord[]; total: number; page: number; pageSize: number }> {
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
      `SELECT COUNT(*)::int AS total FROM dos.integrations ${where}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;

    const dataResult = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.integrations ${where} ORDER BY ${sortCol} ${sortDir} LIMIT ${pageSize} OFFSET ${offset}`,
      params,
    );

    return { data: dataResult.rows as IntegrationRecord[], total, page, pageSize };
  } catch (err) {
    logger.error('[integrations-service] Failed to list integrations', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getById(tenantId: string, id: string): Promise<IntegrationRecord | null> {
  try {
    const result = await safeQuery(
      `SELECT ${COLUMNS} FROM dos.integrations WHERE tenant_id = $1 AND integration_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    return (result.rows[0] as IntegrationRecord) || null;
  } catch (err) {
    logger.error('[integrations-service] Failed to get integration', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function create(tenantId: string, input: CreateIntegrationInput): Promise<IntegrationRecord> {
  const id = randomUUID();
  try {
    const result = await safeQuery(
      `INSERT INTO dos.integrations (integration_id, tenant_id, name, description, type, provider, status, config, credentials_ref, sync_frequency, last_sync_at, error_count, owner_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
       RETURNING ${COLUMNS}`,
      [id, tenantId, input.name ?? null, input.description ?? null, input.type ?? null, input.provider ?? null, input.status ?? null, input.config ?? null, input.credentials_ref ?? null, input.sync_frequency ?? null, input.last_sync_at ?? null, input.error_count ?? null, input.owner_id ?? null],
    );
    logger.info('[integrations-service] Integration created', { id, tenantId });
    return result.rows[0] as IntegrationRecord;
  } catch (err) {
    logger.error('[integrations-service] Failed to create integration', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function update(tenantId: string, id: string, data: Partial<CreateIntegrationInput>): Promise<IntegrationRecord | null> {
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
      `UPDATE dos.integrations SET ${setClauses.join(', ')} WHERE tenant_id = $1 AND integration_id = $2 AND deleted_at IS NULL RETURNING ${COLUMNS}`,
      params,
    );
    logger.info('[integrations-service] Integration updated', { id, tenantId });
    return (result.rows[0] as IntegrationRecord) || null;
  } catch (err) {
    logger.error('[integrations-service] Failed to update integration', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function remove(tenantId: string, id: string): Promise<boolean> {
  try {
    const result = await safeQuery(
      `UPDATE dos.integrations SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND integration_id = $2 AND deleted_at IS NULL`,
      [tenantId, id],
    );
    if (result.rowCount > 0) {
      logger.info('[integrations-service] Integration deleted', { id, tenantId });
      return true;
    }
    return false;
  } catch (err) {
    logger.error('[integrations-service] Failed to delete integration', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function restore(tenantId: string, id: string): Promise<IntegrationRecord | null> {
  try {
    const result = await safeQuery(
      `UPDATE dos.integrations SET deleted_at = NULL, is_deleted = false, updated_at = NOW() WHERE tenant_id = $1 AND integration_id = $2 AND deleted_at IS NOT NULL RETURNING ${COLUMNS}`,
      [tenantId, id],
    );
    if (result.rows[0]) {
      logger.info('[integrations-service] Integration restored', { id, tenantId });
      return result.rows[0] as IntegrationRecord;
    }
    return null;
  } catch (err) {
    logger.error('[integrations-service] Failed to restore integration', { tenantId, id, error: toErrorMessage(err) });
    throw err;
  }
}

export async function bulkCreate(tenantId: string, items: CreateIntegrationInput[]): Promise<IntegrationRecord[]> {
  const results: IntegrationRecord[] = [];
  for (const item of items) {
    results.push(await create(tenantId, item));
  }
  return results;
}

export async function bulkRemove(tenantId: string, ids: string[]): Promise<number> {
  try {
    const result = await safeQuery(
      `UPDATE dos.integrations SET deleted_at = NOW(), is_deleted = true, updated_at = NOW() WHERE tenant_id = $1 AND integration_id = ANY($2) AND deleted_at IS NULL`,
      [tenantId, ids],
    );
    logger.info('[integrations-service] Integrations bulk deleted', { count: result.rowCount, tenantId });
    return result.rowCount;
  } catch (err) {
    logger.error('[integrations-service] Failed to bulk delete integrations', { tenantId, error: toErrorMessage(err) });
    throw err;
  }
}

export async function getStats(tenantId: string): Promise<{
  total: number;
  byStatus: Record<string, number>;
}> {
  try {
    const totalResult = await safeQuery(
      `SELECT COUNT(*)::int AS total FROM dos.integrations WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );
    const statusResult = await safeQuery(
      `SELECT COALESCE(status, 'unknown') AS status, COUNT(*)::int AS count FROM dos.integrations WHERE tenant_id = $1 AND deleted_at IS NULL GROUP BY status`,
      [tenantId],
    );
    const byStatus: Record<string, number> = {};
    for (const row of statusResult.rows) {
      byStatus[(row as any).status] = (row as any).count;
    }
    return { total: totalResult.rows[0]?.total || 0, byStatus };
  } catch (err) {
    logger.error('[integrations-service] Failed to get integration stats', { tenantId, error: toErrorMessage(err) });
    return { total: 0, byStatus: {} };
  }
}

// ── Module Domain Service Integration (Wave 2B) ──────────────────────────
// Delegates to module business logic from modules/integrations with try/catch guards

/**
 * List available connectors from the registry.
 */
export async function listConnectors(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/integrations/dist/integrations/services/connector-registry.service') as any;
    return mod.listConnectors(tenantId);
  } catch (err) {
    logger.warn('[integrations-service] Module listConnectors unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Trigger connector sync for a specific connection.
 */
export async function triggerSync(tenantId: string, connectionId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/integrations/dist/integrations/services/connector-sync.service') as any;
    return mod.triggerSync(tenantId, connectionId);
  } catch (err) {
    logger.warn('[integrations-service] Module triggerSync unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Process connector data.
 */
export async function processConnectorData(tenantId: string, connectorType: string, rawData: unknown): Promise<unknown> {
  try {
    const mod = require('../../../modules/integrations/dist/integrations/services/connector-data-processor.service') as any;
    return mod.processConnectorData(tenantId, connectorType, rawData);
  } catch (err) {
    logger.warn('[integrations-service] Module processConnectorData unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Map connector evidence to GRC objects.
 */
export async function mapConnectorEvidence(tenantId: string, connectorType: string, data: unknown): Promise<unknown> {
  try {
    const mod = require('../../../modules/integrations/dist/integrations/services/connector-evidence-mapper.service') as any;
    return mod.mapConnectorEvidence(tenantId, connectorType, data);
  } catch (err) {
    logger.warn('[integrations-service] Module mapConnectorEvidence unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Resolve integration configuration.
 */
export async function resolveConfig(tenantId: string, integrationCode: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/integrations/dist/integrations/services/integration-config-resolver.service') as any;
    return mod.resolveConfig(tenantId, integrationCode);
  } catch (err) {
    logger.warn('[integrations-service] Module resolveConfig unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Get integration dashboard data.
 */
export async function getIntegrationDashboard(tenantId: string): Promise<unknown> {
  try {
    const mod = require('../../../modules/integrations/dist/integrations/services/integrations-dashboard.service') as any;
    return mod.getIntegrationDashboard(tenantId);
  } catch (err) {
    logger.warn('[integrations-service] Module getIntegrationDashboard unavailable', { error: toErrorMessage(err) });
    return null;
  }
}

export const IntegrationService = { list, getById, create, update, remove, restore, bulkCreate, bulkRemove, getStats, listConnectors, triggerSync, processConnectorData, mapConnectorEvidence, resolveConfig, getIntegrationDashboard };
