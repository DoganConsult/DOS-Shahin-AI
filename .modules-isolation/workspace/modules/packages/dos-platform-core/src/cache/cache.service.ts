// ============================================
// Platform — Unified Cache Service
// Redis-backed with in-memory fallback
// Supports namespaces, TTL, pattern invalidation
// ============================================

import { getRedis, redisConnected } from '@dos/db';
import { logger } from '../observability/logger';
import { toErrorMessage } from '@dos/db';

// ── In-memory fallback cache ──
const memCache = new Map<string, { data: string; expiresAt: number }>();
const MEM_CACHE_MAX = 5000;

function memCleanup(): void {
  if (memCache.size <= MEM_CACHE_MAX) return;
  const now = Date.now();
  for (const [k, v] of memCache) {
    if (v.expiresAt < now) memCache.delete(k);
  }
  // If still over limit, evict oldest
  if (memCache.size > MEM_CACHE_MAX) {
    const keys = [...memCache.keys()];
    const toDelete = keys.slice(0, keys.length - MEM_CACHE_MAX);
    for (const k of toDelete) memCache.delete(k);
  }
}

// ── Default TTLs (seconds) ──
export const CacheTTL = {
  LOOKUP: 3600,        // 1 hour  — lookup tables rarely change
  SESSION: 300,        // 5 min   — onboarding session state
  AGENT_RESULT: 1800,  // 30 min  — agent execution results
  DASHBOARD: 120,      // 2 min   — dashboard aggregations
  USER_PROFILE: 600,   // 10 min  — user/tenant profile
  FRAMEWORK: 3600,     // 1 hour  — framework/registry data
  SHORT: 60,           // 1 min   — volatile data
  MEDIUM: 600,         // 10 min
  LONG: 86400,         // 24 hours
} as const;

// ── Namespace prefixes ──
export const CacheNS = {
  LOOKUP: 'lkp:',
  SESSION: 'sess:',
  AGENT: 'agent:',
  DASHBOARD: 'dash:',
  USER: 'usr:',
  FRAMEWORK: 'fw:',
  TENANT: 'tnt:',
  RATE: 'rate:',
  COMPLIANCE: 'compliance:',
  NAVIGATION: 'nav:',
} as const;

/**
 * Get a cached value. Returns parsed JSON or null.
 */
export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (redisConnected()) {
      const redis = getRedis();
      const raw = await redis.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    }
    // Fallback: in-memory
    const entry = memCache.get(key);
    if (entry && entry.expiresAt > Date.now()) {
      return JSON.parse(entry.data) as T;
    }
    if (entry) memCache.delete(key);
    return null;
  } catch (err: unknown) {
    logger.warn('Cache GET error', { key, error: toErrorMessage(err) });
    return null;
  }
}

/**
 * Set a cached value with TTL (seconds).
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number = CacheTTL.MEDIUM): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    if (redisConnected()) {
      const redis = getRedis();
      await redis.setex(key, ttlSeconds, serialized);
    } else {
      // Fallback: in-memory
      memCache.set(key, { data: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
      memCleanup();
    }
  } catch (err: unknown) {
    logger.warn('Cache SET error', { key, error: toErrorMessage(err) });
  }
}

/**
 * Delete a specific key.
 */
export async function cacheDel(key: string): Promise<void> {
  try {
    if (redisConnected()) {
      await getRedis().del(key);
    }
    memCache.delete(key);
  } catch (err: unknown) {
    logger.warn('Cache DEL error', { key, error: toErrorMessage(err) });
  }
}

/**
 * Delete all keys matching a pattern (e.g. "lkp:*" to clear all lookups).
 * Uses SCAN to avoid blocking Redis.
 */
export async function cacheInvalidatePattern(pattern: string): Promise<number> {
  let deleted = 0;
  try {
    if (redisConnected()) {
      const redis = getRedis();
      // Note: keyPrefix is already applied by ioredis, so we scan with raw pattern
      const stream = redis.scanStream({ match: pattern, count: 100 });
      const pipeline = redis.pipeline();
      let batchCount = 0;

      await new Promise<void>((resolve, reject) => {
        stream.on('data', (keys: string[]) => {
          for (const key of keys) {
            // ioredis scanStream returns keys WITH the prefix, so delete directly
            pipeline.del(key);
            batchCount++;
            deleted++;
          }
        });
        stream.on('end', async () => {
          if (batchCount > 0) await pipeline.exec();
          resolve();
        });
        stream.on('error', reject);
      });
    }

    // Also clear matching in-memory keys
    for (const key of memCache.keys()) {
      if (matchGlob(key, pattern)) {
        memCache.delete(key);
        deleted++;
      }
    }
  } catch (err: unknown) {
    logger.warn('Cache invalidate pattern error', { pattern, error: toErrorMessage(err) });
  }
  return deleted;
}

/**
 * Invalidate all keys in a namespace.
 */
export async function cacheInvalidateNamespace(ns: string): Promise<number> {
  return cacheInvalidatePattern(`${ns}*`);
}

/**
 * Invalidate compliance cache for a tenant (overview, frameworks, etc.).
 * Call after compliance writes: gap/remediation/finding/control/evidence/framework/assessment updates.
 */
export async function invalidateComplianceCache(tenantId: string): Promise<number> {
  return cacheInvalidatePattern(`${CacheNS.COMPLIANCE}${tenantId}:*`);
}

/**
 * Get-or-set pattern: returns cached value or calls fetcher, caches result.
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CacheTTL.MEDIUM,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return cached;
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return fresh;
}

/**
 * Get-or-set with metadata: returns { data, fromCache } for observability.
 */
export async function cacheGetOrSetWithMeta<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = CacheTTL.MEDIUM,
): Promise<{ data: T; fromCache: boolean }> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) return { data: cached, fromCache: true };
  const fresh = await fetcher();
  await cacheSet(key, fresh, ttlSeconds);
  return { data: fresh, fromCache: false };
}

/**
 * Flush the entire cache (admin operation).
 */
export async function cacheFlushAll(): Promise<void> {
  try {
    if (redisConnected()) {
      // Only flush keys with our prefix (SCAN + DEL)
      await cacheInvalidatePattern('*');
    }
    memCache.clear();
    logger.info('Cache: flushed all');
  } catch (err: unknown) {
    logger.warn('Cache flush error', { error: toErrorMessage(err) });
  }
}

/**
 * Get cache stats for monitoring.
 */
export async function cacheStats(): Promise<{
  backend: 'redis' | 'memory';
  memoryKeys: number;
  redisInfo?: { keys: number; usedMemory: string; hitRate: string };
}> {
  const stats: any = {
    backend: redisConnected() ? 'redis' : 'memory',
    memoryKeys: memCache.size,
  };

  if (redisConnected()) {
    try {
      const redis = getRedis();
      const info = await redis.info('stats');
      const memInfo = await redis.info('memory');
      const dbInfo = await redis.info('keyspace');

      const hits = parseInt(extractInfoValue(info, 'keyspace_hits') || '0', 10);
      const misses = parseInt(extractInfoValue(info, 'keyspace_misses') || '0', 10);
      const total = hits + misses;
      const hitRate = total > 0 ? ((hits / total) * 100).toFixed(1) + '%' : 'N/A';

      const usedMemory = extractInfoValue(memInfo, 'used_memory_human') || 'any';
      const keysLine = extractInfoValue(dbInfo, 'db0') || '';
      const keysMatch = keysLine.match(/keys=(\d+)/);

      stats.redisInfo = {
        keys: keysMatch ? parseInt(keysMatch[1], 10) : 0,
        usedMemory,
        hitRate,
      };
    } catch { /* ignore stats errors */ }
  }
  return stats;
}

// ── Helpers ──

function extractInfoValue(info: string, key: string): string | null {
  const match = info.match(new RegExp(`^${key}:(.+)$`, 'm'));
  return match ? match[1].trim() : null;
}

function matchGlob(str: string, pattern: string): boolean {
  const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
  return regex.test(str);
}
