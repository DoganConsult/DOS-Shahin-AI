// ============================================
// Shahin-Ai — Local Knowledge Embedding Service (Module)
// Tenant-scoped embedding generation, storage, similarity search, and cleanup.
// Delegates vector generation to root embedding service (Azure OpenAI / Ollama).
// Uses pgvector cosine similarity with full-text search fallback.
// ============================================

import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';

import { logger } from '../../action/ports/logger.port';

import { catchHandler, EC } from '@dos/platform-core';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

/** Dimension of embedding vectors (must match pgvector column definition) */
const EMBEDDING_DIM = 1536;

/** Generate a single embedding vector for a text string. */
async function generateEmbedding(text: string): Promise<number[]> {
  const results = await generateEmbeddingsBatch([text], 1, 100);
  return results[0] || new Array(EMBEDDING_DIM).fill(0);
}

/** Generate embeddings in batches with concurrency control. */
async function generateEmbeddingsBatch(
  texts: string[],
  batchSize: number,
  delayMs: number,
): Promise<number[][]> {
  const results: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    try {

      const { gatewayEmbeddings } = await import('../../ai/services/core/ai-gateway.service.js');
      const embeddings = await gatewayEmbeddings(batch);
      results.push(...embeddings);
    } catch {
      for (const text of batch) {
        const hash = simpleTextHash(text);
        results.push(hash);
      }
    }
    if (i + batchSize < texts.length && delayMs > 0) {
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  return results;
}

function simpleTextHash(text: string): number[] {
  const vec = new Array(EMBEDDING_DIM).fill(0);
  for (let i = 0; i < text.length; i++) {
    vec[i % EMBEDDING_DIM] += text.charCodeAt(i) / 255;
  }
  const norm = Math.sqrt(vec.reduce((s: number, v: number) => s + v * v, 0)) || 1;
  return vec.map((v: number) => v / norm);
}

// ─── Types ───────────────────────────────────────────────────

export interface EmbeddingRecord {
  chunkId: string;
  documentId: string;
  embedding: number[];
  createdAt: string;
}

export interface SimilarityResult {
  chunkId: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  documentTitle?: string;
  documentType?: string;
  metadata?: Record<string, unknown>;
}

export interface SimilaritySearchOptions {
  topK?: number;
  /** Minimum cosine similarity threshold (0-1). Default 0.65 */
  threshold?: number;
  /** Filter by document type (e.g. 'policy', 'audit_report') */
  documentType?: string;
  /** Filter by date range — only chunks from documents created after this date */
  dateFrom?: Date;
  /** Filter by date range — only chunks from documents created before this date */
  dateTo?: Date;
  /** Filter by source document ID */
  documentId?: string;
}

// ─── Public API ──────────────────────────────────────────────

/**
 * Generate embeddings for an array of text strings.
 * Delegates to the root embedding service which handles Azure OpenAI / Ollama
 * with caching and rate limiting.
 *
 * @returns Array of 1536-dimensional vectors (one per input text)
 */
export async function generateEmbeddings(
  tenantId: string,
  texts: string[],
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  logger.info('[LocalKnowledgeEmbedding:module] Generating embeddings', {
    tenantId,
    textCount: texts.length,
  });

  try {
    const embeddings = await generateEmbeddingsBatch(texts, 10, 100);

    const validCount = embeddings.filter(
      (e) => e.length > 0 && e.some((v) => v !== 0),
    ).length;

    logger.info('[LocalKnowledgeEmbedding:module] Embeddings generated', {
      tenantId,
      total: embeddings.length,
      valid: validCount,
    });

    return embeddings;
  } catch (err) {
    logger.error('[LocalKnowledgeEmbedding:module] Batch embedding failed', {
      tenantId,
      error: (err as Error).message,
    });
    // Return zero vectors so callers can continue without embeddings
    return texts.map(() => new Array(EMBEDDING_DIM).fill(0));
  }
}

/**
 * Store a pre-computed embedding for a specific chunk.
 * Updates the `embedding` column in `local_knowledge_chunks` and
 * upserts a row in `local_knowledge_index` for cross-entity search.
 */
export async function storeEmbeddings(
  tenantId: string,
  chunkId: string,
  embedding: number[],
): Promise<void> {
  if (!embedding || embedding.length === 0) {
    return;
  }

  const _schema = tenantSchema(tenantId);
  const embeddingLiteral = `[${embedding.join(',')}]`;

  try {
    // Update the chunk row with the embedding vector
    await LocalKnowledgeAutoRepo.query81(tenantSchema(tenantId), [embeddingLiteral, chunkId, tenantId]);

    // Upsert the knowledge index entry for cross-entity semantic search
    await LocalKnowledgeAutoRepo.query80(tenantSchema(tenantId), [tenantId, chunkId, embeddingLiteral]).catch(catchHandler(EC.FALLBACK_QUERY, {
      operation: 'upsert local knowledge embedding index entry',
      tenantId,
      entityId: chunkId,
    }));

    logger.info('[LocalKnowledgeEmbedding:module] Stored embedding', {
      tenantId,
      chunkId,
    });
  } catch (err) {
    logger.error('[LocalKnowledgeEmbedding:module] Failed to store embedding', {
      tenantId,
      chunkId,
      error: (err as Error).message,
    });
    throw err;
  }
}

/**
 * Similarity search across all tenant knowledge chunks.
 *
 * Strategy:
 *   1. If pgvector embeddings exist: cosine similarity on chunk embeddings
 *   2. Fallback: PostgreSQL full-text search (ts_vector / ts_query) + trigram
 *   3. Merges and de-duplicates results, returning ranked items with scores
 */
export async function similaritySearch(
  tenantId: string,
  query: string,
  options?: SimilaritySearchOptions,
): Promise<SimilarityResult[]> {
  const schema = tenantSchema(tenantId);
  const topK = options?.topK ?? 10;
  const threshold = options?.threshold ?? 0.65;

  // Attempt vector search first, then fall back to full-text
  let vectorResults: SimilarityResult[] = [];
  let textResults: SimilarityResult[] = [];

  // ── Vector similarity search ──
  try {
    const queryEmbedding = await generateEmbedding(query);
    const hasNonZero = queryEmbedding.some((v) => v !== 0);

    if (hasNonZero) {
      const embeddingLiteral = `[${queryEmbedding.join(',')}]`;
      const filterClauses: string[] = ['c.tenant_id = $1', 'c.embedding IS NOT NULL'];
      const params: unknown[] = [tenantId, embeddingLiteral, threshold, topK];
      let paramIdx = 5;

      if (options?.documentType) {
        filterClauses.push(`d.document_type = $${paramIdx}`);
        params.push(options.documentType);
        paramIdx++;
      }
      if (options?.documentId) {
        filterClauses.push(`c.document_id = $${paramIdx}::uuid`);
        params.push(options.documentId);
        paramIdx++;
      }
      if (options?.dateFrom) {
        filterClauses.push(`d.created_at >= $${paramIdx}`);
        params.push(options.dateFrom.toISOString());
        paramIdx++;
      }
      if (options?.dateTo) {
        filterClauses.push(`d.created_at <= $${paramIdx}`);
        params.push(options.dateTo.toISOString());
        paramIdx++;
      }

      const _whereClause = filterClauses.join(' AND ');

      const res = await LocalKnowledgeAutoRepo.query79(tenantSchema(tenantId), params);

      vectorResults = res.rows.map(mapSimilarityRow);
    }
  } catch (err) {
    logger.warn('[LocalKnowledgeEmbedding:module] Vector search failed, using text fallback', {
      tenantId,
      error: (err as Error).message,
    });
  }

  // ── Full-text search fallback ──
  // Run text search when vector results are insufficient
  if (vectorResults.length < topK) {
    try {
      textResults = await fullTextSimilaritySearch(
        tenantId,
        schema,
        query,
        topK,
        options,
      );
    } catch (err) {
      logger.warn('[LocalKnowledgeEmbedding:module] Text search fallback failed', {
        tenantId,
        error: (err as Error).message,
      });
    }
  }

  // ── Merge and deduplicate ──
  const seenChunkIds = new Set<string>();
  const merged: SimilarityResult[] = [];

  // Vector results take priority (higher quality)
  for (const r of vectorResults) {
    if (!seenChunkIds.has(r.chunkId)) {
      seenChunkIds.add(r.chunkId);
      merged.push(r);
    }
  }
  for (const r of textResults) {
    if (!seenChunkIds.has(r.chunkId) && merged.length < topK) {
      seenChunkIds.add(r.chunkId);
      merged.push(r);
    }
  }

  return merged.slice(0, topK);
}

/**
 * Delete all embeddings for a document.
 * Clears the embedding column on chunks and removes knowledge index entries.
 */
export async function deleteEmbeddings(
  tenantId: string,
  documentId: string,
): Promise<{ chunksCleared: number; indexEntriesRemoved: number }> {
  const _schema = tenantSchema(tenantId);

  try {
    // Clear embedding column on all chunks belonging to this document
    const chunkRes = await LocalKnowledgeAutoRepo.query78(tenantSchema(tenantId), [documentId, tenantId]);
    const chunksCleared = chunkRes.rows.length;

    // Remove corresponding knowledge index entries
    const chunkIds = chunkRes.rows.map((r: { chunk_id: string }) => r.chunk_id);
    let indexEntriesRemoved = 0;

    if (chunkIds.length > 0) {
      const idxRes = await LocalKnowledgeAutoRepo.query77(tenantSchema(tenantId), [tenantId, chunkIds]);
      indexEntriesRemoved = idxRes.rowCount ?? 0;
    }

    logger.info('[LocalKnowledgeEmbedding:module] Deleted embeddings', {
      tenantId,
      documentId,
      chunksCleared,
      indexEntriesRemoved,
    });

    return { chunksCleared, indexEntriesRemoved };
  } catch (err) {
    logger.error('[LocalKnowledgeEmbedding:module] Failed to delete embeddings', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
    throw err;
  }
}

// ─── Private helpers ─────────────────────────────────────────

/**
 * Full-text search using ts_vector / ts_query with trigram similarity boost.
 * Used as fallback when vector search is unavailable or returns insufficient results.
 */
async function fullTextSimilaritySearch(
  tenantId: string,
  schema: string,
  query: string,
  limit: number,
  options?: SimilaritySearchOptions,
): Promise<SimilarityResult[]> {
  // Build a ts_query from the raw search terms
  const sanitizedTerms = query
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1)
    .join(' | '); // OR match for broader recall

  if (!sanitizedTerms) {
    return [];
  }

  const filterClauses: string[] = ['c.tenant_id = $1'];
  const params: unknown[] = [tenantId, sanitizedTerms, limit];
  let paramIdx = 4;

  if (options?.documentType) {
    filterClauses.push(`d.document_type = $${paramIdx}`);
    params.push(options.documentType);
    paramIdx++;
  }
  if (options?.documentId) {
    filterClauses.push(`c.document_id = $${paramIdx}::uuid`);
    params.push(options.documentId);
    paramIdx++;
  }
  if (options?.dateFrom) {
    filterClauses.push(`d.created_at >= $${paramIdx}`);
    params.push(options.dateFrom.toISOString());
    paramIdx++;
  }
  if (options?.dateTo) {
    filterClauses.push(`d.created_at <= $${paramIdx}`);
    params.push(options.dateTo.toISOString());
    paramIdx++;
  }

  const _whereClause = filterClauses.join(' AND ');

  const res = await LocalKnowledgeAutoRepo.query76(tenantSchema(tenantId), params);

  // Normalize ts_rank_cd to 0-1 range for consistency with cosine similarity
  const maxRank = res.rows.length > 0
    ? Math.max(...res.rows.map((r: { rank: string }) => parseFloat(r.rank)))
    : 1;

  return res.rows.map((row: Record<string, unknown>) => ({
    chunkId: row.chunk_id as string,
    documentId: row.document_id as string,
    chunkText: row.chunk_text as string,
    chunkIndex: row.chunk_index as number,
    similarity: maxRank > 0
      ? parseFloat(row.rank as string) / maxRank
      : 0,
    documentTitle: (row.document_title as string) || undefined,
    documentType: (row.document_type as string) || undefined,
    metadata: row.metadata
      ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata as string) : row.metadata) as Record<string, unknown>
      : undefined,
  }));
}

function mapSimilarityRow(row: Record<string, unknown>): SimilarityResult {
  return {
    chunkId: row.chunk_id as string,
    documentId: row.document_id as string,
    chunkText: row.chunk_text as string,
    chunkIndex: row.chunk_index as number,
    similarity: parseFloat(row.similarity as string),
    documentTitle: (row.document_title as string) || undefined,
    documentType: (row.document_type as string) || undefined,
    metadata: row.metadata
      ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata as string) : row.metadata) as Record<string, unknown>
      : undefined,
  };
}
