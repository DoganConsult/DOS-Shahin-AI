
import { catchHandler, EC } from '@dos/platform-core';
// ============================================
// Shahin-Ai — Local Knowledge Cache Service
// Intelligent caching layer for RAG query results
// Two-tier: Redis (fast, volatile) → PostgreSQL (persistent fallback)
// ============================================

import { getRedis, redisConnected } from '../../action/ports/platform.port';
import { safeQuery as _safeQuery, tenantSchema } from '../../action/ports/database.port';
import { logger } from '../../action/ports/logger.port';
import type { GenericRow } from '@dos/types';
import { LocalKnowledgeAutoRepo } from "../repositories/auto-extracted.repo";

const CACHE_PREFIX = 'lk:cache:';
const DEFAULT_QUERY_TTL = 3600;       // 1 hour for query results
const DEFAULT_ENTITY_TTL = 86400;     // 24 hours for entity context

// ═══════════════════════════════════════════════
// getCachedResult — Two-tier lookup (Redis → DB)
// ═══════════════════════════════════════════════

/**
 * Look up a cached RAG response by tenant and query hash.
 * 1. Tries Redis first for low-latency hits.
 * 2. Falls back to the `local_knowledge_cache` table.
 * 3. Checks TTL expiry and invalidation flag.
 * Returns null on miss; the cached result object on hit.
 */
export async function getCachedResult(
  tenantId: string,
  queryHash: string,
): Promise<any | null> {
  const redisKey = `${CACHE_PREFIX}${tenantId}:${queryHash}`;

  // Tier 1: Redis
  if (redisConnected()) {
    try {
      const redis = getRedis();
      const raw = await redis.get(redisKey);
      if (raw) {
        // Increment hit count asynchronously in DB (fire-and-forget)
        incrementDbHitCount(tenantId, queryHash).catch(catchHandler(EC.CACHE_OP, {}));
        return JSON.parse(raw);
      }
    } catch (err) {
      logger.warn('[LKCache] Redis GET failed, falling back to DB', {
        tenantId,
        queryHash,
        error: (err as Error).message,
      });
    }
  }

  // Tier 2: PostgreSQL
  try {
    const _schema = tenantSchema(tenantId);
    const { rows } = await LocalKnowledgeAutoRepo.query33(tenantSchema(tenantId), [tenantId, queryHash]);

    if (rows.length === 0) {
      return null;
    }

    const row = rows[0];

    // Bump hit count + last_hit_at
    incrementDbHitCount(tenantId, queryHash).catch(catchHandler(EC.CACHE_OP, {}));

    // Backfill Redis so subsequent reads are fast
    if (redisConnected()) {
      const remainingTtl = Math.max(
        1,
        Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000),
      );
      try {
        const redis = getRedis();
        await redis.setex(redisKey, remainingTtl, JSON.stringify(row.result));
      } catch { /* non-fatal */ }
    }

    return row.result;
  } catch (err) {
    logger.warn('[LKCache] DB lookup failed', {
      tenantId,
      queryHash,
      error: (err as Error).message,
    });
    return null;
  }
}

// ═══════════════════════════════════════════════
// setCachedResult — Store in both tiers
// ═══════════════════════════════════════════════

export interface SetCacheOptions {
  /** Human-readable query text for debugging/analytics */
  queryText?: string;
  /** UUIDs of documents referenced in the result (for targeted invalidation) */
  documentIds?: string[];
  /** Response time in ms (tracked for analytics) */
  responseMs?: number;
}

/**
 * Store a RAG response in the two-tier cache.
 * 1. Stores in Redis with TTL if available.
 * 2. Always upserts into the DB as persistent fallback.
 * Default TTL: 1 hour for query results, 24 hours for entity context.
 */
export async function setCachedResult(
  tenantId: string,
  queryHash: string,
  result: unknown,
  ttlSeconds: number = DEFAULT_QUERY_TTL,
  options: SetCacheOptions = {},
): Promise<void> {
  const redisKey = `${CACHE_PREFIX}${tenantId}:${queryHash}`;
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();

  // Tier 1: Redis (best-effort)
  if (redisConnected()) {
    try {
      const redis = getRedis();
      await redis.setex(redisKey, ttlSeconds, JSON.stringify(result));
    } catch (err) {
      logger.warn('[LKCache] Redis SET failed', {
        tenantId,
        queryHash,
        error: (err as Error).message,
      });
    }
  }

  // Tier 2: PostgreSQL (persistent)
  try {
    const _schema = tenantSchema(tenantId);
    await LocalKnowledgeAutoRepo.query32(tenantSchema(tenantId), [
            tenantId,
            queryHash,
            options.queryText ?? null,
            JSON.stringify(result),
            options.documentIds ?? null,
            ttlSeconds,
            expiresAt,
            options.responseMs ?? 0,
          ]);
  } catch (err) {
    logger.warn('[LKCache] DB upsert failed', {
      tenantId,
      queryHash,
      error: (err as Error).message,
    });
  }
}

// ═══════════════════════════════════════════════
// invalidateCache — Targeted or tenant-wide
// ═══════════════════════════════════════════════

/**
 * Invalidate cache entries.
 * - If documentId provided: invalidate all entries whose document_ids array contains it.
 * - If no documentId: invalidate all entries for the tenant.
 * Clears matching Redis keys and marks DB rows as invalidated.
 */
export async function invalidateCache(
  tenantId: string,
  documentId?: string,
): Promise<void> {
  const _schema = tenantSchema(tenantId);

  // Step 1: Collect affected query hashes (for Redis cleanup)
  let affectedHashes: string[] = [];
  try {
    if (documentId) {
      const { rows } = await LocalKnowledgeAutoRepo.query31(tenantSchema(tenantId), [tenantId, documentId]);
      affectedHashes = rows.map((r: GenericRow) => r.query_hash);
    } else {
      const { rows } = await LocalKnowledgeAutoRepo.query30(tenantSchema(tenantId), [tenantId]);
      affectedHashes = rows.map((r: GenericRow) => r.query_hash);
    }
  } catch (err) {
    logger.warn('[LKCache] DB invalidation failed', {
      tenantId,
      documentId,
      error: (err as Error).message,
    });
  }

  // Step 2: Clear corresponding Redis keys
  if (redisConnected() && affectedHashes.length > 0) {
    try {
      const redis = getRedis();
      const keys = affectedHashes.map((h) => `${CACHE_PREFIX}${tenantId}:${h}`);
      await redis.del(...keys);
    } catch (err) {
      logger.warn('[LKCache] Redis invalidation failed', {
        tenantId,
        keyCount: affectedHashes.length,
        error: (err as Error).message,
      });
    }
  }

  logger.info('[LKCache] Cache invalidated', {
    tenantId,
    documentId: documentId ?? 'all',
    entriesInvalidated: affectedHashes.length,
  });
}

// ═══════════════════════════════════════════════
// getCacheStats — Analytics for monitoring
// ═══════════════════════════════════════════════

export interface CacheStats {
  totalEntries: number;
  activeEntries: number;
  invalidatedEntries: number;
  expiredEntries: number;
  totalHits: number;
  avgResponseMs: number;
  /** Approximate hit rate: total_hits / (total_hits + active_entries) */
  hitRate: number;
  /** Approximate storage in bytes (JSONB result column) */
  storageBytesEstimate: number;
}

/**
 * Return cache statistics for a tenant: hit rate, total entries,
 * estimated storage, and average response time.
 */
export async function getCacheStats(tenantId: string): Promise<CacheStats> {
  try {
    const _schema = tenantSchema(tenantId);
    const { rows } = await LocalKnowledgeAutoRepo.query29(tenantSchema(tenantId), [tenantId]);

    const r = rows[0];
    const totalHits = r.total_hits;
    const activeEntries = r.active_entries;
    // Approximate hit rate: hits / (hits + active misses that became entries)
    const hitRate = totalHits + activeEntries > 0
      ? Math.round((totalHits / (totalHits + activeEntries)) * 10000) / 100
      : 0;

    return {
      totalEntries: r.total_entries,
      activeEntries,
      invalidatedEntries: r.invalidated_entries,
      expiredEntries: r.expired_entries,
      totalHits,
      avgResponseMs: Math.round(r.avg_response_ms * 100) / 100,
      hitRate,
      storageBytesEstimate: Number(r.storage_bytes_estimate),
    };
  } catch (err) {
    logger.warn('[LKCache] Failed to compute cache stats', {
      tenantId,
      error: (err as Error).message,
    });
    return {
      totalEntries: 0,
      activeEntries: 0,
      invalidatedEntries: 0,
      expiredEntries: 0,
      totalHits: 0,
      avgResponseMs: 0,
      hitRate: 0,
      storageBytesEstimate: 0,
    };
  }
}

// ═══════════════════════════════════════════════
// cleanupExpiredEntries — Scheduled maintenance
// ═══════════════════════════════════════════════

/**
 * Delete expired and invalidated cache entries from the DB.
 * Intended to be called from a scheduled job (e.g., daily cleanup).
 * Returns the number of rows deleted.
 */
export async function cleanupExpiredEntries(tenantId: string): Promise<number> {
  try {
    const _schema = tenantSchema(tenantId);
    const { rowCount } = await LocalKnowledgeAutoRepo.query28(tenantSchema(tenantId), [tenantId]);

    const deleted = rowCount ?? 0;
    if (deleted > 0) {
      logger.info('[LKCache] Cleaned up expired entries', {
        tenantId,
        deletedCount: deleted,
      });
    }
    return deleted;
  } catch (err) {
    logger.warn('[LKCache] Cleanup failed', {
      tenantId,
      error: (err as Error).message,
    });
    return 0;
  }
}

// ═══════════════════════════════════════════════
// Re-export TTL constants for external use
// ═══════════════════════════════════════════════

export { DEFAULT_QUERY_TTL, DEFAULT_ENTITY_TTL };

// ═══════════════════════════════════════════════
// Internal helpers
// ═══════════════════════════════════════════════

/**
 * Increment the hit_count and last_hit_at for a cache row (fire-and-forget).
 */
async function incrementDbHitCount(tenantId: string, queryHash: string): Promise<void> {
  const _schema = tenantSchema(tenantId);
  await LocalKnowledgeAutoRepo.query27(tenantSchema(tenantId), [tenantId, queryHash]);
}
