/**
 * pgvector RAG Adapter — Semantic search for AI agents.
 *
 * Uses PostgreSQL pgvector extension (v0.8.2 installed) for:
 *   - Document embedding storage with auto-chunking
 *   - Cosine similarity search (HNSW index)
 *   - Hybrid search (vector + keyword)
 *   - Batch operations
 *
 * Embedding generation via AI gateway or OpenAI-compatible API.
 * Table: {tenant_schema}.rag_embeddings (auto-created with HNSW index)
 */

import { safeQuery, tenantSchema } from '@dos/db';
import { generateEmbedding, generateEmbeddingsBatch, EMBEDDING_DIM } from './embedding-generator';
import { chunkDocument, type ChunkOptions } from './document-chunker';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/platform-core/resilience';

export interface RagDocument {
  documentId: string;
  content: string;
  metadata: Record<string, unknown>;
  embedding?: number[];
  similarity?: number;
}

export interface RagSearchOptions {
  tenantId: string;
  query: string;
  limit?: number;
  minSimilarity?: number;
  sourceFilter?: string;
}

/**
 * Ensure the rag_embeddings table and HNSW index exist.
 */
async function ensureVectorTable(schema: string): Promise<void> {
  await safeQuery(`CREATE EXTENSION IF NOT EXISTS vector`);
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".rag_embeddings (
      document_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      content TEXT NOT NULL,
      content_hash TEXT NOT NULL,
      source_type TEXT NOT NULL DEFAULT 'document',
      source_id TEXT,
      chunk_index INT DEFAULT 0,
      parent_document_id UUID,
      embedding vector(${EMBEDDING_DIM}),
      metadata JSONB DEFAULT '{}',
      tenant_id TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await safeQuery(`
    CREATE INDEX IF NOT EXISTS "${schema}_rag_hnsw_idx"
    ON "${schema}".rag_embeddings
    USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64)
  `).catch(() => {});
  // Content hash index for deduplication
  await safeQuery(`
    CREATE INDEX IF NOT EXISTS "${schema}_rag_content_hash_idx"
    ON "${schema}".rag_embeddings (content_hash, tenant_id)
  `).catch(() => {});
}

/**
 * Generate a simple content hash for deduplication.
 */
function contentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const chr = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

/**
 * Index a single document (no chunking).
 */
export async function indexDocument(
  tenantId: string,
  content: string,
  sourceType: string,
  sourceId: string,
  metadata: Record<string, unknown> = {},
): Promise<string> {
  const schema = tenantSchema(tenantId);
  await ensureVectorTable(schema);

  const hash = contentHash(content);
  const embedding = await generateEmbedding(content);
  const embeddingStr = `[${embedding.join(',')}]`;

  const result = await safeQuery(
    `INSERT INTO "${schema}".rag_embeddings
       (content, content_hash, source_type, source_id, embedding, metadata, tenant_id)
     VALUES ($1, $2, $3, $4, $5::vector, $6, $7)
     ON CONFLICT (document_id) DO UPDATE SET
       content = EXCLUDED.content, embedding = EXCLUDED.embedding,
       metadata = EXCLUDED.metadata, updated_at = NOW()
     RETURNING document_id`,
    [content, hash, sourceType, sourceId, embeddingStr, JSON.stringify(metadata), tenantId],
  );

  return result.rows[0]?.document_id || '';
}

/**
 * Index a document with automatic chunking.
 * Splits the document into chunks, generates embeddings for each,
 * and stores them with a shared parent_document_id.
 */
export async function indexDocumentWithChunking(
  tenantId: string,
  content: string,
  sourceType: string,
  sourceId: string,
  metadata: Record<string, unknown> = {},
  chunkOptions?: ChunkOptions,
): Promise<{ parentDocumentId: string; chunkIds: string[] }> {
  const schema = tenantSchema(tenantId);
  await ensureVectorTable(schema);

  const chunks = chunkDocument(content, chunkOptions);
  if (chunks.length === 0) {
    const id = await indexDocument(tenantId, content, sourceType, sourceId, metadata);
    return { parentDocumentId: id, chunkIds: [id] };
  }

  // Generate embeddings for all chunks in batch
  const texts = chunks.map(c => c.content);
  const embeddings = await generateEmbeddingsBatch(texts);

  // Insert parent record (stores full content without embedding)
  const parentResult = await safeQuery(
    `INSERT INTO "${schema}".rag_embeddings
       (content, content_hash, source_type, source_id, metadata, tenant_id, chunk_index)
     VALUES ($1, $2, $3, $4, $5, $6, -1)
     RETURNING document_id`,
    [content.slice(0, 500) + '...', contentHash(content), sourceType, sourceId, JSON.stringify({ ...metadata, isParent: true, chunkCount: chunks.length }), tenantId],
  );
  const parentDocumentId = parentResult.rows[0]?.document_id || '';

  // Insert chunks
  const chunkIds: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = embeddings[i];
    const embeddingStr = `[${embedding.join(',')}]`;

    const result = await safeQuery(
      `INSERT INTO "${schema}".rag_embeddings
         (content, content_hash, source_type, source_id, chunk_index, parent_document_id,
          embedding, metadata, tenant_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7::vector, $8, $9)
       RETURNING document_id`,
      [
        chunk.content, contentHash(chunk.content), sourceType, sourceId,
        chunk.chunkIndex, parentDocumentId, embeddingStr,
        JSON.stringify({ ...metadata, chunkIndex: chunk.chunkIndex, startOffset: chunk.startOffset, endOffset: chunk.endOffset }),
        tenantId,
      ],
    );
    chunkIds.push(result.rows[0]?.document_id || '');
  }

  return { parentDocumentId, chunkIds };
}

/**
 * Batch index multiple documents with chunking.
 */
export async function batchIndexDocuments(
  tenantId: string,
  documents: Array<{ content: string; sourceType: string; sourceId?: string; metadata?: Record<string, unknown> }>,
  chunkOptions?: ChunkOptions,
): Promise<Array<{ parentDocumentId: string; chunkIds: string[] }>> {
  const results: Array<{ parentDocumentId: string; chunkIds: string[] }> = [];

  for (const doc of documents) {
    try {
      const result = await indexDocumentWithChunking(
        tenantId, doc.content, doc.sourceType, doc.sourceId || '', doc.metadata || {}, chunkOptions,
      );
      results.push(result);
    } catch (err: unknown) {
      logger.warn(`[RAG] Batch index failed for document: ${toErrorMessage(err)}`);
      results.push({ parentDocumentId: '', chunkIds: [] });
    }
  }

  return results;
}

/**
 * Semantic search: find documents similar to a query.
 */
export async function semanticSearch(opts: RagSearchOptions): Promise<RagDocument[]> {
  const schema = tenantSchema(opts.tenantId);
  await ensureVectorTable(schema);

  const queryEmbedding = await generateEmbedding(opts.query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const limit = opts.limit || 10;
  const minSim = opts.minSimilarity || 0.3;

  let sql = `
    SELECT document_id, content, metadata, source_type, source_id,
           1 - (embedding <=> $1::vector) AS similarity
    FROM "${schema}".rag_embeddings
    WHERE 1 - (embedding <=> $1::vector) > $2
      AND chunk_index >= 0
  `;
  const params: unknown[] = [embeddingStr, minSim];

  if (opts.sourceFilter) {
    sql += ` AND source_type = $3`;
    params.push(opts.sourceFilter);
  }

  sql += ` ORDER BY similarity DESC LIMIT ${limit}`;

  const result = await safeQuery(sql, params);

  return result.rows.map((row: Record<string, unknown>) => ({
    documentId: row.document_id as string,
    content: row.content as string,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>) || {},
    similarity: parseFloat(row.similarity as string),
  }));
}

/**
 * Hybrid search: combines vector similarity with keyword matching.
 */
export async function hybridSearch(opts: RagSearchOptions): Promise<RagDocument[]> {
  const schema = tenantSchema(opts.tenantId);
  await ensureVectorTable(schema);

  const queryEmbedding = await generateEmbedding(opts.query);
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  const limit = opts.limit || 10;

  const result = await safeQuery(
    `SELECT document_id, content, metadata, source_type, source_id,
            (0.7 * (1 - (embedding <=> $1::vector)) +
             0.3 * ts_rank(to_tsvector('english', content), plainto_tsquery('english', $2))) AS similarity
     FROM "${schema}".rag_embeddings
     WHERE chunk_index >= 0
       AND ((1 - (embedding <=> $1::vector)) > 0.2
            OR to_tsvector('english', content) @@ plainto_tsquery('english', $2))
     ORDER BY similarity DESC
     LIMIT ${limit}`,
    [embeddingStr, opts.query],
  );

  return result.rows.map((row: Record<string, unknown>) => ({
    documentId: row.document_id as string,
    content: row.content as string,
    metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : (row.metadata as Record<string, unknown>) || {},
    similarity: parseFloat(row.similarity as string),
  }));
}

/**
 * Delete a document and all its chunks.
 */
export async function deleteDocument(tenantId: string, documentId: string): Promise<number> {
  const schema = tenantSchema(tenantId);

  // Delete chunks that reference this as parent
  const childResult = await safeQuery(
    `DELETE FROM "${schema}".rag_embeddings WHERE parent_document_id = $1 AND tenant_id = $2`,
    [documentId, tenantId],
  );

  // Delete the document itself
  const parentResult = await safeQuery(
    `DELETE FROM "${schema}".rag_embeddings WHERE document_id = $1 AND tenant_id = $2`,
    [documentId, tenantId],
  );

  return (childResult.rowCount ?? 0) + (parentResult.rowCount ?? 0);
}

/**
 * Get index statistics for a tenant.
 */
export async function getIndexStats(tenantId: string): Promise<{
  totalDocuments: number;
  totalChunks: number;
  bySourceType: Record<string, number>;
  oldestDocument: string | null;
  newestDocument: string | null;
}> {
  const schema = tenantSchema(tenantId);
  await ensureVectorTable(schema);

  const countResult = await safeQuery(
    `SELECT
       COUNT(*) FILTER (WHERE chunk_index = -1 OR parent_document_id IS NULL)::int AS total_documents,
       COUNT(*) FILTER (WHERE chunk_index >= 0)::int AS total_chunks,
       MIN(created_at)::text AS oldest,
       MAX(created_at)::text AS newest
     FROM "${schema}".rag_embeddings
     WHERE tenant_id = $1`,
    [tenantId],
  );

  const byTypeResult = await safeQuery(
    `SELECT source_type, COUNT(*)::int AS count
     FROM "${schema}".rag_embeddings
     WHERE tenant_id = $1 AND chunk_index >= 0
     GROUP BY source_type`,
    [tenantId],
  );

  const row = countResult.rows[0] || {};
  const bySourceType: Record<string, number> = {};
  for (const r of byTypeResult.rows) {
    bySourceType[r.source_type as string] = r.count as number;
  }

  return {
    totalDocuments: (row.total_documents as number) || 0,
    totalChunks: (row.total_chunks as number) || 0,
    bySourceType,
    oldestDocument: (row.oldest as string) || null,
    newestDocument: (row.newest as string) || null,
  };
}
