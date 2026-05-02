// ============================================
// Shahin-Ai — Local Knowledge Documents Service (Module Layer)
// R3.3B: Full document management with CRUD, search, stats,
// and integration with the ingestion pipeline.
// Delegates to the canonical services layer for DB operations
// and extends with additional capabilities.
// ============================================

import * as crypto from 'crypto';

import { emptyResult, safeQuery as _safeQuery, tenantSchema, withTransaction } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { recordCustodyEvent } from './local-knowledge-custody-chain.service';

export interface KnowledgeDocument {
  id: string;
  title: string;
  documentType: string;
  sourceType?: string;
  sourceId?: string;
  status: string;
  knowledgeLane?: string;
  confidentialityLevel?: string;
  workspaceId?: string;
  moduleScope?: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

import { swallowDefault, EC } from '@dos/platform-core';
import { SYSTEM_JOB_ACTOR } from '../../action/ports/platform.port';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

const LOG_TAG = '[LocalKnowledgeDocuments:Module]';

// ---------------------------------------------------------------
// Types
// ---------------------------------------------------------------

export interface DocumentFilters {
  documentType?: string;
  knowledgeLane?: string;
  status?: string;
  workspaceId?: string;
  moduleScope?: string;
  searchQuery?: string;
  confidentialityLevel?: string;
}

export interface CreateDocumentInput {
  title: string;
  documentType: string;
  sourceType?: string;
  sourceId?: string;
  content?: string;
  contentBuffer?: Buffer;
  contentType?: string;
  knowledgeLane?: string;
  confidentialityLevel?: string;
  workspaceId?: string;
  moduleScope?: string[];
  metadata?: Record<string, unknown>;
  userId?: string;
}

export interface UpdateDocumentInput {
  title?: string;
  documentType?: string;
  confidentialityLevel?: string;
  moduleScope?: string[];
  metadata?: Record<string, unknown>;
  content?: string;
  userId?: string;
}

export interface DocumentWithChunkCount extends KnowledgeDocument {
  chunkCount: number;
  lastAccessedAt?: string;
  canonicalData?: Record<string, unknown>;
  legalHold?: boolean;
  ingestionId?: string;
  searchableText?: string;
}

export interface DocumentStats {
  totalDocuments: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  byLane: Record<string, number>;
  storageUsedBytes: number;
  documentsWithEmbeddings: number;
  averageChunksPerDocument: number;
}



// ---------------------------------------------------------------
// Internal canonical helpers
// ---------------------------------------------------------------

async function searchDocumentsCanonical(
  tenantId: string,
  query: string,
  pagination?: PaginationParams,
  _accessControl?: { userId: string; userRole: string; userOrgUnits?: string[] },
): Promise<PaginatedResponse<KnowledgeDocument>> {
  const _schema = tenantSchema(tenantId);
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), LocalKnowledgeAutoRepo.query75(tenantSchema(tenantId), [tenantId, `%${query}%`, pageSize, offset]), { tenantId, operation: 'search documents' });
  const countRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), LocalKnowledgeAutoRepo.query74(tenantSchema(tenantId), [tenantId, `%${query}%`]), { tenantId, operation: 'count documents' });
  const total = countRes.rows[0]?.total ?? 0;
  return { data: res.rows.map(mapDocRow), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function listDocumentsCanonical(
  tenantId: string,
  filters: Record<string, string | undefined>,
  _accessControl?: { userId: string; userRole: string; userOrgUnits?: string[] },
  pagination?: PaginationParams,
): Promise<PaginatedResponse<KnowledgeDocument>> {
  const _schema = tenantSchema(tenantId);
  const page = pagination?.page ?? 1;
  const pageSize = pagination?.pageSize ?? 20;
  const offset = (page - 1) * pageSize;
  const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
  const params: unknown[] = [tenantId];
  let idx = 2;
  if (filters.documentType) { conditions.push(`document_type = $${idx++}`); params.push(filters.documentType); }
  if (filters.knowledgeLane) { conditions.push(`knowledge_lane = $${idx++}`); params.push(filters.knowledgeLane); }
  if (filters.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters.workspaceId) { conditions.push(`workspace_id = $${idx++}`); params.push(filters.workspaceId); }
  const _where = conditions.join(' AND ');
  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), LocalKnowledgeAutoRepo.query73(tenantSchema(tenantId), [...params, pageSize, offset]), { tenantId, operation: 'list documents' });
  const countRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), LocalKnowledgeAutoRepo.query72(tenantSchema(tenantId), params), { tenantId, operation: 'count documents' });
  const total = countRes.rows[0]?.total ?? 0;
  return { data: res.rows.map(mapDocRow), total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
}

async function getDocumentCanonical(
  tenantId: string,
  documentId: string,
  _includeDeleted?: boolean,
): Promise<DocumentWithChunkCount | null> {
  const _schema = tenantSchema(tenantId);
  const res = await LocalKnowledgeAutoRepo.query71(tenantSchema(tenantId), [documentId, tenantId]);
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    ...mapDocRow(row),
    chunkCount: 0,
    legalHold: row.legal_hold ?? false,
    ingestionId: row.ingestion_id,
    searchableText: row.searchable_text,
    canonicalData: typeof row.canonical_data === 'string' ? JSON.parse(row.canonical_data) : (row.canonical_data || {}),
  };
}

async function upsertDocument(
  tenantId: string,
  ingestionId: string | undefined,
  _extractionId: string | undefined,
  documentType: string,
  canonicalData: Record<string, unknown>,
  searchableText: string,
  title: string,
  confidentialityLevel?: string,
  workspaceId?: string,
  moduleScope?: string[],
): Promise<KnowledgeDocument & { documentId: string }> {
  const _schema = tenantSchema(tenantId);
  const res = await LocalKnowledgeAutoRepo.query70(tenantSchema(tenantId), [tenantId, title, documentType, ingestionId, JSON.stringify(canonicalData),
       searchableText, confidentialityLevel || 'internal', workspaceId, moduleScope]);
  const row = res.rows[0];
  return { ...mapDocRow(row), documentId: row.document_id };
}

async function invalidateDocumentCache(tenantId: string, documentId: string): Promise<void> {
  try {
    const { invalidateCache } = await import('./local-knowledge-cache.service.js');
    await invalidateCache(tenantId, documentId);
  } catch { /* best-effort */ }
}

function mapDocRow(row: Record<string, unknown>): KnowledgeDocument {
  return {

    id: row.document_id,

    title: row.title,

    documentType: row.document_type,

    sourceType: row.source_type,

    sourceId: row.source_id,

    status: row.status,

    knowledgeLane: row.knowledge_lane,

    confidentialityLevel: row.confidentiality_level,

    workspaceId: row.workspace_id,

    moduleScope: row.module_scope,
    metadata: typeof row.canonical_data === 'string' ? JSON.parse(row.canonical_data) : row.canonical_data,

    createdAt: row.created_at,

    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------
// List documents with extended filtering
// ---------------------------------------------------------------

/**
 * Lists documents with pagination, filtering, full-text search, and access control.
 * Extends the canonical listDocuments with search-query support.
 */
export async function listDocuments(
  tenantId: string,
  filters?: DocumentFilters,
  accessControl?: { userId: string; userRole: string; userOrgUnits?: string[] },
  pagination?: PaginationParams,
): Promise<PaginatedResponse<KnowledgeDocument>> {
  // If there is a text search query, delegate to searchDocuments
  if (filters?.searchQuery && filters.searchQuery.trim().length > 0) {
    return searchDocumentsCanonical(tenantId, filters.searchQuery, pagination, accessControl);
  }

  return listDocumentsCanonical(
    tenantId,
    {
      documentType: filters?.documentType,
      knowledgeLane: filters?.knowledgeLane,
      status: filters?.status,
      workspaceId: filters?.workspaceId,
      moduleScope: filters?.moduleScope,
    },
    accessControl,
    pagination,
  );
}

// ---------------------------------------------------------------
// Get single document with chunk count and last access time
// ---------------------------------------------------------------

/**
 * Fetches a single document by ID with metadata including chunk count
 * and last accessed timestamp from the access log.
 */
export async function getDocument(
  tenantId: string,
  documentId: string,
): Promise<DocumentWithChunkCount | null> {
  const doc = await getDocumentCanonical(tenantId, documentId);
  if (!doc) return null;

  const _schema = tenantSchema(tenantId);

  // Fetch chunk count and last access date in parallel
  const [chunkRes, accessRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ chunk_count: 0 }]), LocalKnowledgeAutoRepo.query69(tenantSchema(tenantId), [documentId, tenantId]), { tenantId: tenantId, operation: 'query local_knowledge_chunks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ last_accessed_at: null }]), LocalKnowledgeAutoRepo.query68(tenantSchema(tenantId), [documentId, tenantId]), { tenantId: tenantId, operation: 'query local_knowledge_chunks' }),
  ]);

  return {
    ...doc,
    chunkCount: chunkRes.rows[0]?.chunk_count ?? 0,
    lastAccessedAt: accessRes.rows[0]?.last_accessed_at ?? undefined,
  };
}

// ---------------------------------------------------------------
// Create document — inserts record and triggers ingestion pipeline
// ---------------------------------------------------------------

/**
 * Creates a new knowledge document record, logs the ingestion entry,
 * and triggers the asynchronous ingestion pipeline for content
 * extraction, chunking, and embedding generation.
 */
export async function createDocument(
  tenantId: string,
  data: CreateDocumentInput,
): Promise<KnowledgeDocument> {
  const schema = tenantSchema(tenantId);

  // Resolve or create the source entry for this document
  const sourceId = data.sourceId || await ensureManualSource(tenantId, schema);

  // Compute checksum from content (or title as fallback for metadata-only docs)
  const contentForHash = data.content || data.contentBuffer?.toString('utf-8') || data.title;
  const checksum = crypto.createHash('sha256').update(contentForHash).digest('hex');

  // 1. Log the ingestion (provenance record)
  const { logIngestion } = await import('./local-knowledge-ingestion.service.js');
  const ingestionId = await logIngestion(tenantId, `manual:${crypto.randomUUID()}`, {
    sourceId,
    sourceObjectPath: data.title,
    checksum,
    version: '1',
    parserUsed: 'manual-upload',
    extractionMethod: 'deterministic',
    success: true,
    rawContentStoragePath: undefined,
    normalizedContent: data.metadata || {},
    classification: {
      confidentiality: data.confidentialityLevel || 'internal',
      category: data.documentType,
      tags: [],
    },
    provenanceMetadata: {
      source_user: data.userId || SYSTEM_JOB_ACTOR,
      source_system: 'manual-upload',
    },
  });
  const ingestion = { ingestionId };

  // 2. Build canonical data payload
  const canonicalData: Record<string, unknown> = {
    documentType: data.documentType,
    title: data.title,
    sourceType: data.sourceType || 'manual',
    rawText: data.content?.substring(0, 10_000) || '',
    metadata: data.metadata || {},
  };

  // 3. Create the document record
  const document = await upsertDocument(
    tenantId,
    ingestion.ingestionId,
    undefined, // extraction ID — will be populated by ingestion pipeline
    data.documentType,
    canonicalData,
    data.content || data.title, // searchable text
    data.title,
    data.confidentialityLevel,
    data.workspaceId,
    data.moduleScope,
  );

  // 4. Trigger async ingestion pipeline (non-blocking)
  triggerIngestionPipeline(tenantId, document.documentId, ingestion.ingestionId, data).catch(
    (err) => {
      logger.warn(`${LOG_TAG} Async ingestion trigger failed`, {
        tenantId,
        documentId: document.documentId,
        error: (err as Error).message,
      });
    },
  );

  logger.info(`${LOG_TAG} Document created`, {
    tenantId,
    documentId: document.documentId,
    documentType: data.documentType,
    title: data.title,
  });

  return document;
}

// ---------------------------------------------------------------
// Update document — metadata update with optional re-ingestion
// ---------------------------------------------------------------

/**
 * Updates document metadata and optionally re-triggers the ingestion
 * pipeline when content has changed.
 */
export async function updateDocument(
  tenantId: string,
  documentId: string,
  data: UpdateDocumentInput,
): Promise<KnowledgeDocument | null> {
  const _schema = tenantSchema(tenantId);

  // Fetch existing document first
  const existing = await getDocumentCanonical(tenantId, documentId);
  if (!existing) return null;

  const sets: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (data.title !== undefined) {
    sets.push(`title = $${paramIndex++}`);
    params.push(data.title);
  }
  if (data.documentType !== undefined) {
    sets.push(`document_type = $${paramIndex++}`);
    params.push(data.documentType);
  }
  if (data.confidentialityLevel !== undefined) {
    sets.push(`confidentiality_level = $${paramIndex++}`);
    params.push(data.confidentialityLevel);
  }
  if (data.moduleScope !== undefined) {
    sets.push(`module_scope = $${paramIndex++}`);
    params.push(data.moduleScope);
  }
  if (data.metadata !== undefined) {
    // Merge metadata into canonical_data
    const merged = { ...(existing.canonicalData || {}), metadata: data.metadata };
    sets.push(`canonical_data = $${paramIndex++}`);
    params.push(JSON.stringify(merged));
  }

  sets.push(`updated_at = NOW()`);

  if (sets.length <= 1) {
    // Only updated_at — nothing meaningful changed
    return existing;
  }

  params.push(documentId, tenantId);
  const _whereClause = `WHERE document_id = $${paramIndex++} AND tenant_id = $${paramIndex++}`;

  try {
    await LocalKnowledgeAutoRepo.query67(tenantSchema(tenantId), params);

    // Invalidate cache
    await invalidateDocumentCache(tenantId, documentId);

    // Record custody event
    await recordCustodyEvent(tenantId, documentId, 'extracted', data.userId, undefined, {
      action: 'metadata_updated',
      fieldsUpdated: Object.keys(data).filter((k) => k !== 'userId'),
    });

    // If content changed, trigger re-ingestion
    if (data.content !== undefined) {
      const { reIngestDocument } = await import('./local-knowledge-ingestion.service.js');
      reIngestDocument(tenantId, documentId).catch((err) => {
        logger.warn(`${LOG_TAG} Re-ingestion trigger failed`, {
          tenantId,
          documentId,
          error: (err as Error).message,
        });
      });
    }

    return getDocumentCanonical(tenantId, documentId);
  } catch (err) {
    logger.error(`${LOG_TAG} updateDocument failed`, {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return null;
  }
}

// ---------------------------------------------------------------
// Delete document (soft delete)
// ---------------------------------------------------------------

/**
 * Soft-deletes a document by setting deleted_at timestamp.
 * Cascades to chunks (marks as orphaned) and cleans up embeddings.
 * Legal-hold documents cannot be deleted.
 */
export async function deleteDocument(
  tenantId: string,
  documentId: string,
  userId?: string,
): Promise<{ success: boolean; reason?: string }> {
  const schema = tenantSchema(tenantId);

  // Check if document exists and is not under legal hold
  const existing = await getDocumentCanonical(tenantId, documentId, true);
  if (!existing) {
    return { success: false, reason: 'Document not found' };
  }
  if (existing.legalHold) {
    return { success: false, reason: 'Document is under legal hold and cannot be deleted' };
  }
  if (existing.status === 'archived') {
    return { success: false, reason: 'Document is already archived' };
  }

  try {
    await withTransaction(tenantId, async (client) => {
      // 1. Soft-delete the document
      await client.query(
        `UPDATE "${schema}".local_knowledge_documents
         SET status = 'archived', deleted_at = NOW(), deleted_by = $1, updated_at = NOW()
         WHERE document_id = $2 AND tenant_id = $3`,
        [userId || SYSTEM_JOB_ACTOR, documentId, tenantId],
      );

      // 2. Remove chunk embeddings (retain text for recovery period)
      await client.query(
        `UPDATE "${schema}".local_knowledge_chunks
         SET embedding = NULL
         WHERE document_id = $1 AND tenant_id = $2`,
        [documentId, tenantId],
      );

      // 3. Remove from knowledge index
      await client.query(
        `DELETE FROM "${schema}".local_knowledge_index
         WHERE knowledge_item_id = $1 AND tenant_id = $2`,
        [documentId, tenantId],
      );
    });

    // Invalidate cache
    await invalidateDocumentCache(tenantId, documentId);

    // Record custody event
    await recordCustodyEvent(tenantId, documentId, 'deleted', userId, undefined, {
      action: 'soft_delete',
      recoveryPeriodDays: 30,
    });

    logger.info(`${LOG_TAG} Document soft-deleted`, { tenantId, documentId, userId });
    return { success: true };
  } catch (err) {
    logger.error(`${LOG_TAG} deleteDocument failed`, {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return { success: false, reason: (err as Error).message };
  }
}

// ---------------------------------------------------------------
// Document stats — aggregate metrics for the tenant
// ---------------------------------------------------------------

/**
 * Computes aggregate statistics for the tenant's knowledge base:
 * total documents, breakdown by type/status/lane, storage used,
 * embedding coverage, and average chunks per document.
 */
export async function getDocumentStats(tenantId: string): Promise<DocumentStats> {
  const _schema = tenantSchema(tenantId);

  try {
    const [typesRes, statusRes, laneRes, storageRes, embeddingRes, chunksRes] = await Promise.all([
      // Documents by type
      LocalKnowledgeAutoRepo.query66(tenantSchema(tenantId), [tenantId]),
      // Documents by status
      LocalKnowledgeAutoRepo.query65(tenantSchema(tenantId), [tenantId]),
      // Documents by knowledge lane
      LocalKnowledgeAutoRepo.query64(tenantSchema(tenantId), [tenantId]),
      // Storage usage (approximate from text lengths)
      LocalKnowledgeAutoRepo.query63(tenantSchema(tenantId), [tenantId]),
      // Documents with at least one embedded chunk
      LocalKnowledgeAutoRepo.query62(tenantSchema(tenantId), [tenantId]),
      // Average chunks per document
      LocalKnowledgeAutoRepo.query61(tenantSchema(tenantId), [tenantId]),
    ]);

    // Build maps
    const byType: Record<string, number> = {};
    for (const row of typesRes.rows) byType[row.document_type] = row.count;

    const byStatus: Record<string, number> = {};
    for (const row of statusRes.rows) byStatus[row.status] = row.count;

    const byLane: Record<string, number> = {};
    for (const row of laneRes.rows) byLane[row.knowledge_lane] = row.count;

    const totalDocuments = Object.values(byStatus).reduce((sum, n) => sum + n, 0);

    return {
      totalDocuments,
      byType,
      byStatus,
      byLane,
      storageUsedBytes: parseInt(String(storageRes.rows[0]?.total_bytes || '0'), 10),
      documentsWithEmbeddings: embeddingRes.rows[0]?.count ?? 0,
      averageChunksPerDocument: parseFloat(String(chunksRes.rows[0]?.avg_chunks || '0')),
    };
  } catch (err) {
    logger.error(`${LOG_TAG} getDocumentStats failed`, {
      tenantId,
      error: (err as Error).message,
    });
    return {
      totalDocuments: 0,
      byType: {},
      byStatus: {},
      byLane: {},
      storageUsedBytes: 0,
      documentsWithEmbeddings: 0,
      averageChunksPerDocument: 0,
    };
  }
}

// ---------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------

/**
 * Ensures a "manual-upload" source exists for the tenant.
 * Creates one if it does not exist, returning the source_id.
 */
async function ensureManualSource(tenantId: string, _schema: string): Promise<string> {
  const existing = await LocalKnowledgeAutoRepo.query60(tenantSchema(tenantId), [tenantId]);
  if (existing.rows.length > 0) return existing.rows[0].source_id;

  const res = await LocalKnowledgeAutoRepo.query59(tenantSchema(tenantId), [tenantId]);
  return res.rows[0].source_id;
}

/**
 * Triggers the async ingestion pipeline for a newly created document.
 * This is fire-and-forget — failures are logged but do not block the caller.
 */
async function triggerIngestionPipeline(
  tenantId: string,
  documentId: string,
  ingestionId: string,
  data: CreateDocumentInput,
): Promise<void> {
  if (!data.content && !data.contentBuffer) {
    logger.info(`${LOG_TAG} No content provided, skipping ingestion pipeline`, {
      tenantId,
      documentId,
    });
    return;
  }

  try {
    const { ingestDocument } = await import('./local-knowledge-ingestion.service.js');
    await ingestDocument(tenantId, documentId);
  } catch (err) {
    logger.warn(`${LOG_TAG} Ingestion pipeline trigger failed`, {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
  }
}
