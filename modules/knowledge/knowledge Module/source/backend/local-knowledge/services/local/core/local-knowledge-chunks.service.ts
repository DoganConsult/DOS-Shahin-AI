// ============================================
// Shahin-Ai — Local Knowledge Chunks Service (Module)
// Tenant-scoped chunk CRUD, full-text search, and contextual retrieval.
// Chunks are subdivisions of ingested documents stored in
// `local_knowledge_chunks` with ts_vector + pgvector indexes.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { catchHandler, swallowDefault, EC } from '@dos/platform-core/resilience';

// ─── Types ───────────────────────────────────────────────────

export interface KnowledgeChunk {
  chunkId: string;
  tenantId: string;
  documentId: string;
  ingestionId: string;
  chunkIndex: number;
  chunkText: string;
  chunkType?: string;
  tokenCount?: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface ChunkSearchResult extends KnowledgeChunk {
  /** Full-text search rank (normalized 0-1) */
  rank: number;
  /** Document title for display */
  documentTitle?: string;
  /** Document type for filtering */
  documentType?: string;
  /** Previous chunk text for surrounding context */
  prevChunkText?: string;
  /** Next chunk text for surrounding context */
  nextChunkText?: string;
}

export interface ChunkSearchOptions {
  /** Filter to a specific document */
  documentId?: string;
  /** Filter by document type */
  documentType?: string;
  /** Only chunks created after this date */
  dateFrom?: Date;
  /** Only chunks created before this date */
  dateTo?: Date;
  /** Maximum results to return. Default 10 */
  limit?: number;
  /** Offset for pagination. Default 0 */
  offset?: number;
  /** Include surrounding context chunks. Default false */
  includeContext?: boolean;
}

export interface ChunkInput {
  /** Position within the source document */
  chunkIndex: number;
  /** Text content of this chunk */
  content: string;
  /** Approximate token count */
  tokenCount?: number;
  /** Chunk classification: section, paragraph, clause, etc. */
  chunkType?: string;
  /** Additional metadata: extracted entities, key phrases, etc. */
  metadata?: Record<string, unknown>;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Fetch all chunks for a document, ordered by position.
 */
export async function getChunks(
  tenantId: string,
  documentId: string,
): Promise<KnowledgeChunk[]> {
  const schema = tenantSchema(tenantId);

  try {
    const res = await safeQuery(
      `SELECT chunk_id, tenant_id, document_id, ingestion_id,
              chunk_index, chunk_text, chunk_type, metadata, created_at
         FROM "${schema}".local_knowledge_chunks
        WHERE document_id = $1 AND tenant_id = $2
        ORDER BY chunk_index ASC`,
      [documentId, tenantId],
    );

    return res.rows.map(mapChunkRow);
  } catch (err) {
    logger.error('[LocalKnowledgeChunks:module] getChunks failed', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Full-text search across all tenant knowledge chunks.
 *
 * 1. Builds a ts_query from the search terms
 * 2. Ranks results by ts_rank_cd (cover density)
 * 3. Optionally includes surrounding context (prev/next chunk)
 * 4. Supports filters by document, date range, entity type
 */
export async function searchChunks(
  tenantId: string,
  query: string,
  options?: ChunkSearchOptions,
): Promise<ChunkSearchResult[]> {
  const schema = tenantSchema(tenantId);
  const limit = Math.min(options?.limit ?? 10, 100);
  const offset = options?.offset ?? 0;

  // Sanitize and build ts_query: split terms with OR for broader recall
  const sanitizedTerms = query
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);

  if (sanitizedTerms.length === 0) {
    return [];
  }

  // Use AND for precision when few terms, OR for broader recall with many terms
  const joiner = sanitizedTerms.length <= 3 ? ' & ' : ' | ';
  const tsQuery = sanitizedTerms.join(joiner);

  try {
    // Build dynamic WHERE clauses
    const filterClauses: string[] = ['c.tenant_id = $1'];
    const params: unknown[] = [tenantId, tsQuery, limit, offset];
    let paramIdx = 5;

    if (options?.documentId) {
      filterClauses.push(`c.document_id = $${paramIdx}::uuid`);
      params.push(options.documentId);
      paramIdx++;
    }
    if (options?.documentType) {
      filterClauses.push(`d.document_type = $${paramIdx}`);
      params.push(options.documentType);
      paramIdx++;
    }
    if (options?.dateFrom) {
      filterClauses.push(`c.created_at >= $${paramIdx}`);
      params.push(options.dateFrom.toISOString());
      paramIdx++;
    }
    if (options?.dateTo) {
      filterClauses.push(`c.created_at <= $${paramIdx}`);
      params.push(options.dateTo.toISOString());
      paramIdx++;
    }

    const whereClause = filterClauses.join(' AND ');

    const res = await safeQuery(
      `SELECT c.chunk_id, c.tenant_id, c.document_id, c.ingestion_id,
              c.chunk_index, c.chunk_text, c.chunk_type, c.metadata, c.created_at,
              d.title AS document_title, d.document_type,
              ts_rank_cd(
                to_tsvector('english', c.chunk_text),
                to_tsquery('english', $2)
              ) AS rank
         FROM "${schema}".local_knowledge_chunks c
         LEFT JOIN "${schema}".local_knowledge_documents d
           ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
        WHERE ${whereClause}
          AND to_tsvector('english', c.chunk_text) @@ to_tsquery('english', $2)
        ORDER BY rank DESC
        LIMIT $3 OFFSET $4`,
      params,
    );

    if (res.rows.length === 0) {
      // Fallback: try ILIKE if ts_query returns nothing (handles partial words)
      return fallbackILikeSearch(tenantId, schema, query, limit, offset, options);
    }

    // Normalize ranks to 0-1
    const maxRank = Math.max(
      ...res.rows.map((r: { rank: string }) => parseFloat(r.rank)),
      0.001,
    );

    let results: ChunkSearchResult[] = res.rows.map(
      (row: Record<string, unknown>) => ({
        ...mapChunkRow(row),
        rank: parseFloat(row.rank as string) / maxRank,
        documentTitle: (row.document_title as string) || undefined,
        documentType: (row.document_type as string) || undefined,
      }),
    );

    // Optionally attach surrounding context
    if (options?.includeContext) {
      results = await attachSurroundingContext(tenantId, schema, results);
    }

    return results;
  } catch (err) {
    logger.error('[LocalKnowledgeChunks:module] searchChunks failed', {
      tenantId,
      query,
      error: (err as Error).message,
    });
    return [];
  }
}

/**
 * Batch insert chunks for a document.
 * Each chunk gets a ts_vector index on insert for full-text search.
 *
 * @param tenantId  Tenant identifier
 * @param documentId  Parent document UUID
 * @param chunks  Array of chunk inputs with content, position, metadata
 * @param ingestionId  Optional ingestion ID for provenance tracking
 */
export async function createChunks(
  tenantId: string,
  documentId: string,
  chunks: ChunkInput[],
  ingestionId?: string,
): Promise<KnowledgeChunk[]> {
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const schema = tenantSchema(tenantId);
  const created: KnowledgeChunk[] = [];

  // Resolve ingestion ID from the parent document if not provided
  let resolvedIngestionId = ingestionId;
  if (!resolvedIngestionId) {
    try {
      const docRes = await safeQuery(
        `SELECT ingestion_id FROM "${schema}".local_knowledge_documents
          WHERE document_id = $1 AND tenant_id = $2`,
        [documentId, tenantId],
      );
      resolvedIngestionId = docRes.rows[0]?.ingestion_id;
    } catch {
      // Non-critical — ingestion_id may be nullable in some configurations
    }
  }

  for (const chunk of chunks) {
    try {
      // Approximate token count if not provided (rough: 1 token ~ 4 chars)
      const tokenCount = chunk.tokenCount ?? Math.ceil(chunk.content.length / 4);

      const metadata = chunk.metadata
        ? { ...chunk.metadata, token_count: tokenCount }
        : { token_count: tokenCount };

      const res = await safeQuery(
        `INSERT INTO "${schema}".local_knowledge_chunks
           (chunk_id, tenant_id, document_id, ingestion_id, chunk_index,
            chunk_text, chunk_type, metadata, created_at)
         VALUES (
           gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7::jsonb, NOW()
         )
         ON CONFLICT (document_id, chunk_index) DO UPDATE
           SET chunk_text = EXCLUDED.chunk_text,
               chunk_type = EXCLUDED.chunk_type,
               metadata   = EXCLUDED.metadata
         RETURNING *`,
        [
          tenantId,
          documentId,
          resolvedIngestionId,
          chunk.chunkIndex,
          chunk.content,
          chunk.chunkType || 'paragraph',
          JSON.stringify(metadata),
        ],
      );

      if (res.rows.length > 0) {
        created.push(mapChunkRow(res.rows[0]));
      }
    } catch (err) {
      logger.warn('[LocalKnowledgeChunks:module] Failed to insert chunk', {
        tenantId,
        documentId,
        chunkIndex: chunk.chunkIndex,
        error: (err as Error).message,
      });
    }
  }

  logger.info('[LocalKnowledgeChunks:module] Created chunks', {
    tenantId,
    documentId,
    requested: chunks.length,
    created: created.length,
  });

  return created;
}

/**
 * Delete all chunks belonging to a document.
 * Also removes corresponding knowledge index entries.
 *
 * @returns Number of chunks deleted
 */
export async function deleteChunks(
  tenantId: string,
  documentId: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  try {
    // Gather chunk IDs first for index cleanup
    const chunkRes = await safeQuery(
      `DELETE FROM "${schema}".local_knowledge_chunks
        WHERE document_id = $1 AND tenant_id = $2
        RETURNING chunk_id`,
      [documentId, tenantId],
    );
    const deletedCount = chunkRes.rows.length;

    // Clean up knowledge index entries
    if (deletedCount > 0) {
      const chunkIds = chunkRes.rows.map((r: { chunk_id: string }) => r.chunk_id);
      await safeQuery(
        `DELETE FROM "${schema}".local_knowledge_index
          WHERE tenant_id = $1
            AND knowledge_item_type = 'chunk'
            AND knowledge_item_id = ANY($2::uuid[])`,
        [tenantId, chunkIds],
      ).catch(catchHandler(EC.FALLBACK_QUERY, {
        operation: 'delete local knowledge chunk index entries',
        tenantId,
      }));
    }

    logger.info('[LocalKnowledgeChunks:module] Deleted chunks', {
      tenantId,
      documentId,
      deletedCount,
    });

    return deletedCount;
  } catch (err) {
    logger.error('[LocalKnowledgeChunks:module] deleteChunks failed', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Get a chunk with N surrounding chunks for expanded context.
 * Useful for RAG context windows where a single chunk may lack sufficient information.
 *
 * @param windowSize Number of chunks before and after to include. Default 2.
 * @returns The target chunk plus surrounding chunks, ordered by position.
 */
export async function getChunkContext(
  tenantId: string,
  chunkId: string,
  windowSize: number = 2,
): Promise<KnowledgeChunk[]> {
  const schema = tenantSchema(tenantId);

  try {
    // First, resolve the chunk's document and position
    const chunkRes = await safeQuery(
      `SELECT document_id, chunk_index
         FROM "${schema}".local_knowledge_chunks
        WHERE chunk_id = $1 AND tenant_id = $2`,
      [chunkId, tenantId],
    );

    if (chunkRes.rows.length === 0) {
      return [];
    }

    const { document_id: documentId, chunk_index: chunkIndex } = chunkRes.rows[0];
    const minIndex = Math.max(0, chunkIndex - windowSize);
    const maxIndex = chunkIndex + windowSize;

    // Fetch the window of chunks
    const windowRes = await safeQuery(
      `SELECT chunk_id, tenant_id, document_id, ingestion_id,
              chunk_index, chunk_text, chunk_type, metadata, created_at
         FROM "${schema}".local_knowledge_chunks
        WHERE document_id = $1
          AND tenant_id = $2
          AND chunk_index >= $3
          AND chunk_index <= $4
        ORDER BY chunk_index ASC`,
      [documentId, tenantId, minIndex, maxIndex],
    );

    return windowRes.rows.map(mapChunkRow);
  } catch (err) {
    logger.error('[LocalKnowledgeChunks:module] getChunkContext failed', {
      tenantId,
      chunkId,
      error: (err as Error).message,
    });
    return [];
  }
}

// ─── Private helpers ─────────────────────────────────────────

/**
 * Fallback search using ILIKE when full-text ts_query returns no results.
 * Handles partial word matches and abbreviations.
 */
async function fallbackILikeSearch(
  tenantId: string,
  schema: string,
  query: string,
  limit: number,
  offset: number,
  options?: ChunkSearchOptions,
): Promise<ChunkSearchResult[]> {
  const filterClauses: string[] = ['c.tenant_id = $1'];
  const params: unknown[] = [tenantId, `%${query}%`, limit, offset];
  let paramIdx = 5;

  if (options?.documentId) {
    filterClauses.push(`c.document_id = $${paramIdx}::uuid`);
    params.push(options.documentId);
    paramIdx++;
  }
  if (options?.documentType) {
    filterClauses.push(`d.document_type = $${paramIdx}`);
    params.push(options.documentType);
    paramIdx++;
  }

  const whereClause = filterClauses.join(' AND ');

  const res = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT c.chunk_id, c.tenant_id, c.document_id, c.ingestion_id,
            c.chunk_index, c.chunk_text, c.chunk_type, c.metadata, c.created_at,
            d.title AS document_title, d.document_type,
            similarity(c.chunk_text, $2) AS sim_score
       FROM "${schema}".local_knowledge_chunks c
       LEFT JOIN "${schema}".local_knowledge_documents d
         ON d.document_id = c.document_id AND d.tenant_id = c.tenant_id
      WHERE ${whereClause}
        AND c.chunk_text ILIKE $2
      ORDER BY sim_score DESC
      LIMIT $3 OFFSET $4`,
    params,
  ), { tenantId: tenantId, operation: 'query local_knowledge_chunks' }); // similarity() requires pg_trgm; degrade gracefully

  return res.rows.map((row: Record<string, unknown>) => ({
    ...mapChunkRow(row),
    rank: parseFloat((row.sim_score as string) || '0.5'),
    documentTitle: (row.document_title as string) || undefined,
    documentType: (row.document_type as string) || undefined,
  }));
}

/**
 * Attach previous and next chunk text to search results for context display.
 */
async function attachSurroundingContext(
  tenantId: string,
  schema: string,
  results: ChunkSearchResult[],
): Promise<ChunkSearchResult[]> {
  if (results.length === 0) return results;

  // Batch-fetch context for all results in a single query
  const chunkRefs = results.map((r) => ({
    documentId: r.documentId,
    chunkIndex: r.chunkIndex,
  }));

  // Build unique document + index pairs for context lookup
  const contextNeeded = new Map<string, Set<number>>();
  for (const ref of chunkRefs) {
    const existing = contextNeeded.get(ref.documentId) ?? new Set();
    existing.add(ref.chunkIndex - 1);
    existing.add(ref.chunkIndex + 1);
    contextNeeded.set(ref.documentId, existing);
  }

  // Fetch context chunks
  const contextChunks = new Map<string, string>(); // key: "docId:index" -> chunk_text
  for (const [documentId, indices] of contextNeeded) {
    const indexArray = [...indices].filter((i) => i >= 0);
    if (indexArray.length === 0) continue;

    try {
      const res = await safeQuery(
        `SELECT chunk_index, chunk_text
           FROM "${schema}".local_knowledge_chunks
          WHERE document_id = $1 AND tenant_id = $2
            AND chunk_index = ANY($3::int[])`,
        [documentId, tenantId, indexArray],
      );
      for (const row of res.rows) {
        contextChunks.set(`${documentId}:${row.chunk_index}`, row.chunk_text);
      }
    } catch {
      // Non-critical: context enrichment is best-effort
    }
  }

  // Attach to results
  return results.map((r) => ({
    ...r,
    prevChunkText: contextChunks.get(`${r.documentId}:${r.chunkIndex - 1}`) || undefined,
    nextChunkText: contextChunks.get(`${r.documentId}:${r.chunkIndex + 1}`) || undefined,
  }));
}

function mapChunkRow(row: Record<string, unknown>): KnowledgeChunk {
  const metadata = row.metadata
    ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata as string) : row.metadata)
    : undefined;

  return {
    chunkId: row.chunk_id as string,
    tenantId: row.tenant_id as string,
    documentId: row.document_id as string,
    ingestionId: row.ingestion_id as string,
    chunkIndex: row.chunk_index as number,
    chunkText: row.chunk_text as string,
    chunkType: (row.chunk_type as string) || undefined,
    tokenCount: (metadata as Record<string, unknown>)?.token_count as number | undefined,
    metadata: metadata as Record<string, unknown> | undefined,
    createdAt: row.created_at as string,
  };
}
