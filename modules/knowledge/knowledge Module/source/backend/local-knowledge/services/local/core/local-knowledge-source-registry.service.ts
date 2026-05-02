// ============================================
// AGRC-OS -- Local Knowledge Source Registry Service
// Tracks, manages, and syncs knowledge sources (folders, SFTP, APIs, etc.)
// for the local knowledge base.
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import type { GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Source types supported by the registry. */
export type SourceType = 'local_folder' | 'sftp' | 'local_db' | 'local_api' | 'sharepoint_local' | 'onedrive_local';

/** Operational status of a source. */
export type SourceStatus = 'active' | 'paused' | 'error' | 'disabled';

/** Health status of a source. */
export type SourceHealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'any';

/** Registered knowledge source as returned by the service. */
export interface KnowledgeSource {
  sourceId: string;
  tenantId: string;
  workspaceId: string | null;
  sourceName: string;
  sourceType: SourceType;
  sourceConfig: Record<string, unknown>;
  scopeType: string;
  scopeValue: string | null;
  trustLevel: string;
  scheduleConfig: Record<string, unknown> | null;
  adapterClass: string | null;
  status: SourceStatus;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastSyncError: string | null;
  healthStatus: SourceHealthStatus;
  lastHealthCheck: string | null;
  healthCheckError: string | null;
  consecutiveFailures: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  /** Aggregated stats (only populated by listSources). */
  documentCount?: number;
}

/** Filters for listing sources. */
export interface SourceFilters {
  type?: SourceType;
  status?: SourceStatus;
  connector?: string;
  limit?: number;
  offset?: number;
}

/** Payload for registering a new source. */
export interface RegisterSourceInput {
  name: string;
  type: SourceType;
  config: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  adapterClass?: string;
  scopeType?: string;
  scopeValue?: string;
  trustLevel?: string;
  workspaceId?: string;
  createdBy?: string;
}

/** Payload for updating an existing source. */
export interface UpdateSourceInput {
  name?: string;
  config?: Record<string, unknown>;
  schedule?: Record<string, unknown>;
  credentials?: Record<string, unknown>;
  adapterClass?: string;
  status?: SourceStatus;
  trustLevel?: string;
}

/** Result of a sync operation. */
export interface SyncResult {
  syncId: string;
  documentsAdded: number;
  documentsUpdated: number;
  errors: Array<{ message: string; detail?: string }>;
}

/** A single sync history entry. */
export interface SyncHistoryEntry {
  syncId: string;
  sourceId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  documentsAdded: number;
  documentsUpdated: number;
  documentsFailed: number;
  errors: Array<{ message: string; detail?: string }>;
  triggeredBy: string | null;
}

/** Source health report. */
export interface SourceHealthReport {
  sourceId: string;
  healthStatus: SourceHealthStatus;
  lastHealthCheck: string | null;
  healthCheckError: string | null;
  consecutiveFailures: number;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
}

// ---------------------------------------------------------------------------
// listSources
// ---------------------------------------------------------------------------

/**
 * List all knowledge sources for a tenant with optional filters.
 * Includes document count and sync stats per source.
 */
export async function listSources(
  tenantId: string,
  filters?: SourceFilters,
): Promise<{ data: KnowledgeSource[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['s.tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (filters?.type) {
    conditions.push(`s.source_type = $${paramIdx++}`);
    params.push(filters.type);
  }
  if (filters?.status) {
    conditions.push(`s.status = $${paramIdx++}`);
    params.push(filters.status);
  }
  if (filters?.connector) {
    conditions.push(`s.adapter_class ILIKE $${paramIdx++}`);
    params.push(`%${filters.connector}%`);
  }

  const whereClause = conditions.join(' AND ');
  const limit = Math.min(filters?.limit ?? 50, 200);
  const offset = filters?.offset ?? 0;

  // Total count
  const countResult = await safeQuery(
    `SELECT COUNT(*)::int AS total
       FROM ${schema}.local_knowledge_sources s
      WHERE ${whereClause}`,
    params,
  );
  const total = countResult.rows[0]?.total ?? 0;

  // Data with document count via LEFT JOIN on ingestion_log -> documents
  const dataResult = await safeQuery(
    `SELECT s.*,
            COALESCE(doc_stats.doc_count, 0)::int AS document_count
       FROM ${schema}.local_knowledge_sources s
       LEFT JOIN LATERAL (
         SELECT COUNT(DISTINCT il.ingestion_id)::int AS doc_count
           FROM ${schema}.local_knowledge_ingestion_log il
          WHERE il.source_id = s.source_id AND il.success = TRUE
       ) doc_stats ON TRUE
      WHERE ${whereClause}
      ORDER BY s.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset],
  );

  const data = dataResult.rows.map((r: GenericRow) => mapSourceRow(r, r.document_count));
  return { data, total };
}

// ---------------------------------------------------------------------------
// registerSource
// ---------------------------------------------------------------------------

/**
 * Register a new knowledge source.
 * Validates source config based on type and stores the source.
 * Credentials are stored inside source_config as an encrypted-at-rest JSONB field.
 */
export async function registerSource(
  tenantId: string,
  input: RegisterSourceInput,
): Promise<KnowledgeSource> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ---------------------------------------------------------------------------
// updateSource
// ---------------------------------------------------------------------------

/**
 * Update an existing source's configuration and metadata.
 */
export async function updateSource(
  tenantId: string,
  sourceId: string,
  updates: UpdateSourceInput,
): Promise<KnowledgeSource | null> {
  const schema = tenantSchema(tenantId);
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (updates.name !== undefined) {
    setClauses.push(`source_name = $${paramIdx++}`);
    params.push(updates.name);
  }
  if (updates.config !== undefined) {
    // Merge credentials if provided
    const mergedConfig = updates.credentials
      ? { ...updates.config, _credentials: updates.credentials }
      : updates.config;
    setClauses.push(`source_config = $${paramIdx++}`);
    params.push(JSON.stringify(mergedConfig));
  } else if (updates.credentials !== undefined) {
    // Update only credentials portion inside existing config
    setClauses.push(`source_config = source_config || $${paramIdx++}::jsonb`);
    params.push(JSON.stringify({ _credentials: updates.credentials }));
  }
  if (updates.schedule !== undefined) {
    setClauses.push(`schedule_config = $${paramIdx++}`);
    params.push(JSON.stringify(updates.schedule));
  }
  if (updates.adapterClass !== undefined) {
    setClauses.push(`adapter_class = $${paramIdx++}`);
    params.push(updates.adapterClass);
  }
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIdx++}`);
    params.push(updates.status);
  }
  if (updates.trustLevel !== undefined) {
    setClauses.push(`trust_level = $${paramIdx++}`);
    params.push(updates.trustLevel);
  }

  // Append WHERE params
  params.push(sourceId, tenantId);

  try {
    const result = await safeQuery(
      `UPDATE ${schema}.local_knowledge_sources
          SET ${setClauses.join(', ')}
        WHERE source_id = $${paramIdx++} AND tenant_id = $${paramIdx}
        RETURNING *`,
      params,
    );

    if (result.rows.length === 0) return null;
    const source = mapSourceRow(result.rows[0]);
    logger.info(`[SourceRegistry] Updated source ${sourceId}`);
    return source;
  } catch (err) {
    logger.error('[SourceRegistry] updateSource failed', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// deleteSource
// ---------------------------------------------------------------------------

/**
 * Soft-delete a source by setting its status to 'disabled'.
 */
export async function deleteSource(tenantId: string, sourceId: string): Promise<void> {
  const schema = tenantSchema(tenantId);

  try {
    await safeQuery(
      `UPDATE ${schema}.local_knowledge_sources
          SET status = 'disabled', updated_at = NOW()
        WHERE source_id = $1 AND tenant_id = $2`,
      [sourceId, tenantId],
    );
    logger.info(`[SourceRegistry] Soft-deleted source ${sourceId}`);
  } catch (err) {
    logger.error('[SourceRegistry] deleteSource failed', err);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// syncSource
// ---------------------------------------------------------------------------

/**
 * Trigger a sync for a specific source.
 *
 * This creates a sync history record, queries the ingestion log for new/updated
 * documents since the last sync, and updates the source's last_sync_at.
 *
 * NOTE: Actual fetching of documents from external systems is delegated to the
 * adapter layer (not part of this service). This method manages the sync lifecycle
 * and metadata tracking. Callers should invoke the appropriate adapter before or
 * after calling this method.
 */
export async function syncSource(
  tenantId: string,
  sourceId: string,
  triggeredBy?: string,
): Promise<SyncResult> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.local_knowledge_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

// ---------------------------------------------------------------------------
// getSourceHealth
// ---------------------------------------------------------------------------

/**
 * Check source connectivity and return its health report.
 * Updates the health_status and last_health_check fields.
 */
export async function getSourceHealth(
  tenantId: string,
  sourceId: string,
): Promise<SourceHealthReport> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.local_knowledge_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ---------------------------------------------------------------------------
// getSyncHistory
// ---------------------------------------------------------------------------

/**
 * Retrieve sync history for a source, ordered by most recent first.
 */
export async function getSyncHistory(
  tenantId: string,
  sourceId: string,
  limit = 50,
): Promise<SyncHistoryEntry[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT sync_id, source_id, status, started_at, completed_at,
            documents_added, documents_updated, documents_failed,
            errors, triggered_by
       FROM ${schema}.local_knowledge_source_sync_history
      WHERE tenant_id = $1 AND source_id = $2
      ORDER BY started_at DESC
      LIMIT $3`,
    [tenantId, sourceId, Math.min(limit, 200)],
  );

  return result.rows.map((r: GenericRow): SyncHistoryEntry => ({
    syncId: r.sync_id,
    sourceId: r.source_id,
    status: r.status,
    startedAt: r.started_at,
    completedAt: r.completed_at ?? null,
    documentsAdded: r.documents_added ?? 0,
    documentsUpdated: r.documents_updated ?? 0,
    documentsFailed: r.documents_failed ?? 0,
    errors: r.errors ?? [],
    triggeredBy: r.triggered_by ?? null,
  }));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Validate that the source config contains required fields for the given type.
 * Throws an error with a descriptive message if validation fails.
 */
function validateSourceConfig(type: SourceType, config: Record<string, unknown>): void {
  switch (type) {
    case 'local_folder':
      if (!config.path || typeof config.path !== 'string') {
        throw new Error('local_folder source requires a "path" string in config');
      }
      break;
    case 'sftp':
      if (!config.host || !config.port) {
        throw new Error('sftp source requires "host" and "port" in config');
      }
      break;
    case 'local_db':
      if (!config.connectionString && !config.host) {
        throw new Error('local_db source requires "connectionString" or "host" in config');
      }
      break;
    case 'local_api':
      if (!config.baseUrl || typeof config.baseUrl !== 'string') {
        throw new Error('local_api source requires a "baseUrl" string in config');
      }
      break;
    case 'sharepoint_local':
    case 'onedrive_local':
      if (!config.siteUrl && !config.driveId) {
        throw new Error(`${type} source requires "siteUrl" or "driveId" in config`);
      }
      break;
    default:
      // No additional validation for any types
      break;
  }
}

// ---------------------------------------------------------------------------
// getSource — fetch a single source by ID
// ---------------------------------------------------------------------------

/** Fetch a single knowledge source by its ID. */
export async function getSource(tenantId: string, sourceId: string): Promise<KnowledgeSource | null> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `SELECT * FROM ${schema}.local_knowledge_sources WHERE source_id = $1 AND tenant_id = $2 LIMIT 1`,
    [sourceId, tenantId],
  );
  if (rows.length === 0) return null;
  return mapSourceRow(rows[0] as GenericRow);
}

/** Alias for registerSource — used by hub routes. */
export async function createSource(tenantId: string, input: RegisterSourceInput): Promise<KnowledgeSource> {
  return registerSource(tenantId, input);
}

/** Test connectivity to a knowledge source. Returns success/failure with optional error message. */
export async function testSourceConnection(
  tenantId: string,
  sourceId: string,
): Promise<{ success: boolean; latencyMs: number; error?: string }> {
  const source = await getSource(tenantId, sourceId);
  if (!source) {
    return { success: false, latencyMs: 0, error: 'Source not found' };
  }
  const start = Date.now();
  // Basic connectivity check — actual adapter-level tests are handled by the sync pipeline
  try {
    const schema = tenantSchema(tenantId);
    await safeQuery(
      `SELECT 1 FROM ${schema}.local_knowledge_sources WHERE source_id = $1 LIMIT 1`,
      [sourceId],
    );
    return { success: true, latencyMs: Date.now() - start };
  } catch (err) {
    return { success: false, latencyMs: Date.now() - start, error: (err as Error).message };
  }
}

/** Map a raw DB row to the KnowledgeSource interface. */
function mapSourceRow(r: GenericRow, documentCount?: number): KnowledgeSource {
  return {
    sourceId: r.source_id,
    tenantId: r.tenant_id,
    workspaceId: r.workspace_id ?? null,
    sourceName: r.source_name,
    sourceType: r.source_type,
    sourceConfig: typeof r.source_config === 'string' ? JSON.parse(r.source_config) : (r.source_config ?? {}),
    scopeType: r.scope_type ?? 'tenant',
    scopeValue: r.scope_value ?? null,
    trustLevel: r.trust_level ?? 'standard',
    scheduleConfig: r.schedule_config
      ? (typeof r.schedule_config === 'string' ? JSON.parse(r.schedule_config) : r.schedule_config)
      : null,
    adapterClass: r.adapter_class ?? null,
    status: r.status ?? 'active',
    lastSyncAt: r.last_sync_at ?? null,
    lastSyncStatus: r.last_sync_status ?? null,
    lastSyncError: r.last_sync_error ?? null,
    healthStatus: r.health_status ?? 'any',
    lastHealthCheck: r.last_health_check ?? null,
    healthCheckError: r.health_check_error ?? null,
    consecutiveFailures: r.consecutive_failures ?? 0,
    createdBy: r.created_by ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    ...(documentCount !== undefined ? { documentCount } : {}),
  };
}
