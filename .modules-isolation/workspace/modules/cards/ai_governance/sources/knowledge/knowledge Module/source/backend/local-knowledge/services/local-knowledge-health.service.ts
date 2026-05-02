// ============================================
// Shahin-Ai — Local Knowledge Health Service
// Comprehensive knowledge base health monitoring
// ============================================

import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import { getCacheStats, CacheStats } from './local-knowledge-cache.service';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

// ═══════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════

export type HealthStatus = 'healthy' | 'degraded' | 'critical';

export interface KnowledgeBaseHealth {
  score: number;               // 0–100
  status: HealthStatus;
  details: {
    documents: DocumentHealthDetails;
    chunks: ChunkHealthDetails;
    embeddings: EmbeddingCoverageDetails;
    ingestion: IngestionQueueDetails;
    indexFreshness: IndexFreshnessDetails;
    cache: CacheStats;
  };
  recommendations: string[];
}

export interface DocumentHealthDetails {
  total: number;
  active: number;
  processing: number;
  failed: number;
  archived: number;
  deleted: number;
}

export interface ChunkHealthDetails {
  total: number;
  avgPerDocument: number;
  orphanedChunks: number;
}

export interface EmbeddingCoverageDetails {
  documentsWithEmbeddings: number;
  documentsWithoutEmbeddings: number;
  /** 0–100 */
  coveragePercent: number;
}

export interface IngestionQueueDetails {
  pending: number;
  inProgress: number;
  failed: number;
  successRate: number;  // 0–100
}

export interface IndexFreshnessDetails {
  totalIndexed: number;
  oldestUnindexedDocumentAge: string | null;
  staleIndexEntries: number;
}

export interface IngestionMetrics {
  totalIngestions: number;
  successful: number;
  failed: number;
  avgProcessingMs: number;
  throughputPerDay: number;
  byMethod: Record<string, number>;
}

export interface SearchMetrics {
  totalSearches: number;
  avgResultCount: number;
  avgResponseMs: number;
  zeroResultSearches: number;
}

// ═══════════════════════════════════════════════
// getKnowledgeBaseHealth — Comprehensive check
// ═══════════════════════════════════════════════

/**
 * Comprehensive health check for the tenant's local knowledge base.
 * Queries document counts, chunk stats, embedding coverage,
 * ingestion queue, index freshness, and cache stats.
 * Calculates a weighted health score (0–100) with recommendations.
 */
export async function getKnowledgeBaseHealth(
  tenantId: string,
): Promise<KnowledgeBaseHealth> {
  const schema = tenantSchema(tenantId);

  // Run independent queries in parallel for speed
  const [documents, chunks, embeddings, ingestion, freshness, cache] =
    await Promise.all([
      queryDocumentHealth(schema, tenantId),
      queryChunkHealth(schema, tenantId),
      queryEmbeddingCoverage(schema, tenantId),
      queryIngestionQueue(schema, tenantId),
      queryIndexFreshness(schema, tenantId),
      getCacheStats(tenantId),
    ]);

  // Compute weighted score
  const embeddingScore = embeddings.coveragePercent;                       // 30%
  const ingestionScore = ingestion.successRate;                            // 25%
  const freshnessScore = computeFreshnessScore(freshness);                 // 20%
  const cacheScore = Math.min(cache.hitRate, 100);                         // 15%
  const errorScore = computeErrorScore(documents, ingestion);              // 10%

  const rawScore =
    embeddingScore * 0.30 +
    ingestionScore * 0.25 +
    freshnessScore * 0.20 +
    cacheScore * 0.15 +
    errorScore * 0.10;

  const score = Math.round(Math.max(0, Math.min(100, rawScore)));
  const status: HealthStatus =
    score >= 75 ? 'healthy' : score >= 40 ? 'degraded' : 'critical';

  const recommendations = buildRecommendations(
    documents,
    chunks,
    embeddings,
    ingestion,
    freshness,
    cache,
  );

  return {
    score,
    status,
    details: {
      documents,
      chunks,
      embeddings,
      ingestion,
      indexFreshness: freshness,
      cache,
    },
    recommendations,
  };
}

// ═══════════════════════════════════════════════
// getIngestionMetrics — Throughput analytics
// ═══════════════════════════════════════════════

/**
 * Ingestion throughput metrics for a given time window.
 * Defaults to the last 30 days.
 */
export async function getIngestionMetrics(
  tenantId: string,
  timeRange?: { from?: string; to?: string },
): Promise<IngestionMetrics> {
  const _schema = tenantSchema(tenantId);
  const from = timeRange?.from ?? new Date(Date.now() - 30 * 86400000).toISOString();
  const to = timeRange?.to ?? new Date().toISOString();

  try {
    const { rows } = await LocalKnowledgeAutoRepo.query90(tenantSchema(tenantId), [tenantId, from, to]);

    // Method breakdown
    const { rows: methodRows } = await LocalKnowledgeAutoRepo.query89(tenantSchema(tenantId), [tenantId, from, to]);

    const byMethod: Record<string, number> = {};
    for (const mr of methodRows) {
      byMethod[mr.extraction_method ?? 'any'] = mr.cnt;
    }

    const r = rows[0];
    return {
      totalIngestions: r.total,
      successful: r.successful,
      failed: r.failed,
      avgProcessingMs: Math.round(r.avg_processing_ms * 100) / 100,
      throughputPerDay: Math.round(r.throughput_per_day * 100) / 100,
      byMethod,
    };
  } catch (err) {
    logger.warn('[LKHealth] Failed to compute ingestion metrics', {
      tenantId,
      error: (err as Error).message,
    });
    return {
      totalIngestions: 0,
      successful: 0,
      failed: 0,
      avgProcessingMs: 0,
      throughputPerDay: 0,
      byMethod: {},
    };
  }
}

// ═══════════════════════════════════════════════
// getSearchMetrics — Search quality analytics
// ═══════════════════════════════════════════════

/**
 * Search quality metrics: average result count, response time, zero-result rate.
 * Reads from the local_knowledge_cache table which tracks RAG queries.
 */
export async function getSearchMetrics(
  tenantId: string,
  timeRange?: { from?: string; to?: string },
): Promise<SearchMetrics> {
  const _schema = tenantSchema(tenantId);
  const from = timeRange?.from ?? new Date(Date.now() - 30 * 86400000).toISOString();
  const to = timeRange?.to ?? new Date().toISOString();

  try {
    const { rows } = await LocalKnowledgeAutoRepo.query88(tenantSchema(tenantId), [tenantId, from, to]);

    const r = rows[0];
    return {
      totalSearches: r.total_searches,
      avgResultCount: Math.round(r.avg_result_count * 100) / 100,
      avgResponseMs: Math.round(r.avg_response_ms * 100) / 100,
      zeroResultSearches: r.zero_result_searches,
    };
  } catch (err) {
    logger.warn('[LKHealth] Failed to compute search metrics', {
      tenantId,
      error: (err as Error).message,
    });
    return {
      totalSearches: 0,
      avgResultCount: 0,
      avgResponseMs: 0,
      zeroResultSearches: 0,
    };
  }
}

// ═══════════════════════════════════════════════
// Internal query helpers
// ═══════════════════════════════════════════════

async function queryDocumentHealth(
  schema: string,
  tenantId: string,
): Promise<DocumentHealthDetails> {
  try {
    const { rows } = await LocalKnowledgeAutoRepo.query87(tenantSchema(tenantId), [tenantId]);
    return rows[0];
  } catch (err) {
    logger.warn('[LKHealth] Document health query failed', { tenantId, error: (err as Error).message });
    return { total: 0, active: 0, processing: 0, failed: 0, archived: 0, deleted: 0 };
  }
}

async function queryChunkHealth(
  schema: string,
  tenantId: string,
): Promise<ChunkHealthDetails> {
  try {
    const { rows } = await LocalKnowledgeAutoRepo.query86(tenantSchema(tenantId), [tenantId]);

    const r = rows[0];
    return {
      total: r.total,
      avgPerDocument: Math.round(r.avg_per_document * 100) / 100,
      orphanedChunks: r.orphaned_chunks,
    };
  } catch (err) {
    logger.warn('[LKHealth] Chunk health query failed', { tenantId, error: (err as Error).message });
    return { total: 0, avgPerDocument: 0, orphanedChunks: 0 };
  }
}

async function queryEmbeddingCoverage(
  schema: string,
  tenantId: string,
): Promise<EmbeddingCoverageDetails> {
  try {
    const { rows } = await LocalKnowledgeAutoRepo.query85(tenantSchema(tenantId), [tenantId]);

    const r = rows[0];
    const total = r.with_embeddings + r.without_embeddings;
    const pct = total > 0 ? Math.round((r.with_embeddings / total) * 10000) / 100 : 100;

    return {
      documentsWithEmbeddings: r.with_embeddings,
      documentsWithoutEmbeddings: r.without_embeddings,
      coveragePercent: pct,
    };
  } catch (err) {
    logger.warn('[LKHealth] Embedding coverage query failed', { tenantId, error: (err as Error).message });
    return { documentsWithEmbeddings: 0, documentsWithoutEmbeddings: 0, coveragePercent: 100 };
  }
}

async function queryIngestionQueue(
  schema: string,
  tenantId: string,
): Promise<IngestionQueueDetails> {
  try {
    // Approximate queue by looking at recent ingestion log entries:
    // - "pending" = ingested in the last 5 min with no success flag yet
    // - "in progress" = recent entries within the processing window
    // - "failed" = success = false
    const { rows } = await LocalKnowledgeAutoRepo.query84(tenantSchema(tenantId), [tenantId]);

    const r = rows[0];
    const completed = r.succeeded + r.failed;
    const successRate = completed > 0
      ? Math.round((r.succeeded / completed) * 10000) / 100
      : 100;

    return {
      pending: r.pending,
      inProgress: r.in_progress,
      failed: r.failed,
      successRate,
    };
  } catch (err) {
    logger.warn('[LKHealth] Ingestion queue query failed', { tenantId, error: (err as Error).message });
    return { pending: 0, inProgress: 0, failed: 0, successRate: 100 };
  }
}

async function queryIndexFreshness(
  schema: string,
  tenantId: string,
): Promise<IndexFreshnessDetails> {
  try {
    const { rows } = await LocalKnowledgeAutoRepo.query83(tenantSchema(tenantId), [tenantId]);

    const r = rows[0];
    return {
      totalIndexed: r.total_indexed,
      oldestUnindexedDocumentAge: r.oldest_unindexed_age ?? null,
      staleIndexEntries: r.stale_entries,
    };
  } catch (err) {
    logger.warn('[LKHealth] Index freshness query failed', { tenantId, error: (err as Error).message });
    return { totalIndexed: 0, oldestUnindexedDocumentAge: null, staleIndexEntries: 0 };
  }
}

// ═══════════════════════════════════════════════
// Score computation helpers
// ═══════════════════════════════════════════════

/** Freshness score: 100 if all indexed, decays with stale entries */
function computeFreshnessScore(freshness: IndexFreshnessDetails): number {
  if (freshness.totalIndexed === 0 && freshness.oldestUnindexedDocumentAge === null) {
    // No documents at all — nothing to index, consider fresh
    return 100;
  }
  const staleRatio = freshness.totalIndexed > 0
    ? freshness.staleIndexEntries / freshness.totalIndexed
    : 0;
  const unindexedPenalty = freshness.oldestUnindexedDocumentAge ? 20 : 0;
  return Math.max(0, 100 - staleRatio * 100 - unindexedPenalty);
}

/** Error score: 100 if no errors, drops with failed ingestions and superseded docs */
function computeErrorScore(
  docs: DocumentHealthDetails,
  ingestion: IngestionQueueDetails,
): number {
  const docTotal = docs.total || 1;
  const failedDocRatio = docs.failed / docTotal;
  const failedIngRatio = ingestion.failed / Math.max(ingestion.pending + ingestion.inProgress + ingestion.failed, 1);
  return Math.max(0, 100 - failedDocRatio * 50 - failedIngRatio * 50);
}

// ═══════════════════════════════════════════════
// Recommendation builder
// ═══════════════════════════════════════════════

function buildRecommendations(
  docs: DocumentHealthDetails,
  chunks: ChunkHealthDetails,
  embeddings: EmbeddingCoverageDetails,
  ingestion: IngestionQueueDetails,
  freshness: IndexFreshnessDetails,
  cache: CacheStats,
): string[] {
  const recs: string[] = [];

  if (embeddings.coveragePercent < 80) {
    recs.push(
      `Embedding coverage is ${embeddings.coveragePercent}%. Run embedding generation for ${embeddings.documentsWithoutEmbeddings} documents without vectors.`,
    );
  }

  if (ingestion.successRate < 90) {
    recs.push(
      `Ingestion success rate is ${ingestion.successRate}%. Review ${ingestion.failed} failed ingestions for recurring errors.`,
    );
  }

  if (freshness.staleIndexEntries > 0) {
    recs.push(
      `${freshness.staleIndexEntries} index entries are older than 7 days. Re-index to improve search accuracy.`,
    );
  }

  if (freshness.oldestUnindexedDocumentAge) {
    recs.push(
      `There are unindexed documents (oldest: ${freshness.oldestUnindexedDocumentAge}). Trigger re-indexing.`,
    );
  }

  if (chunks.orphanedChunks > 0) {
    recs.push(
      `${chunks.orphanedChunks} orphaned chunks found (no parent document). Run cleanup to remove them.`,
    );
  }

  if (cache.hitRate < 30 && cache.totalEntries > 10) {
    recs.push(
      `Cache hit rate is ${cache.hitRate}%. Consider increasing TTL for frequently accessed queries.`,
    );
  }

  if (cache.expiredEntries > 100) {
    recs.push(
      `${cache.expiredEntries} expired cache entries remain. Run cache cleanup to reclaim storage.`,
    );
  }

  if (docs.deleted > 0) {
    recs.push(
      `${docs.deleted} soft-deleted documents exist. Review and permanently purge if past retention period.`,
    );
  }

  if (recs.length === 0) {
    recs.push('Knowledge base is in good health. No immediate actions required.');
  }

  return recs;
}
