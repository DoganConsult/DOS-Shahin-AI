"use strict";
// ============================================
// Platform — Unified Cache Service
// Redis-backed with in-memory fallback
// Supports namespaces, TTL, pattern invalidation
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheNS = exports.CacheTTL = void 0;
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
exports.cacheDel = cacheDel;
exports.cacheInvalidatePattern = cacheInvalidatePattern;
exports.cacheInvalidateNamespace = cacheInvalidateNamespace;
exports.invalidateComplianceCache = invalidateComplianceCache;
exports.cacheGetOrSet = cacheGetOrSet;
exports.cacheGetOrSetWithMeta = cacheGetOrSetWithMeta;
exports.cacheFlushAll = cacheFlushAll;
exports.cacheStats = cacheStats;
const db_1 = require("@dos/db");
const logger_1 = require("../observability/logger");
const db_2 = require("@dos/db");
// ── In-memory fallback cache ──
const memCache = new Map();
const MEM_CACHE_MAX = 5000;
function memCleanup() {
    if (memCache.size <= MEM_CACHE_MAX)
        return;
    const now = Date.now();
    for (const [k, v] of memCache) {
        if (v.expiresAt < now)
            memCache.delete(k);
    }
    // If still over limit, evict oldest
    if (memCache.size > MEM_CACHE_MAX) {
        const keys = [...memCache.keys()];
        const toDelete = keys.slice(0, keys.length - MEM_CACHE_MAX);
        for (const k of toDelete)
            memCache.delete(k);
    }
}
// ── Default TTLs (seconds) ──
exports.CacheTTL = {
    LOOKUP: 3600, // 1 hour  — lookup tables rarely change
    SESSION: 300, // 5 min   — onboarding session state
    AGENT_RESULT: 1800, // 30 min  — agent execution results
    DASHBOARD: 120, // 2 min   — dashboard aggregations
    USER_PROFILE: 600, // 10 min  — user/tenant profile
    FRAMEWORK: 3600, // 1 hour  — framework/registry data
    SHORT: 60, // 1 min   — volatile data
    MEDIUM: 600, // 10 min
    LONG: 86400, // 24 hours
};
// ── Namespace prefixes ──
exports.CacheNS = {
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
};
/**
 * Get a cached value. Returns parsed JSON or null.
 */
async function cacheGet(key) {
    try {
        if ((0, db_1.redisConnected)()) {
            const redis = (0, db_1.getRedis)();
            const raw = await redis.get(key);
            if (raw === null)
                return null;
            return JSON.parse(raw);
        }
        // Fallback: in-memory
        const entry = memCache.get(key);
        if (entry && entry.expiresAt > Date.now()) {
            return JSON.parse(entry.data);
        }
        if (entry)
            memCache.delete(key);
        return null;
    }
    catch (err) {
        logger_1.logger.warn('Cache GET error', { key, error: (0, db_2.toErrorMessage)(err) });
        return null;
    }
}
/**
 * Set a cached value with TTL (seconds).
 */
async function cacheSet(key, value, ttlSeconds = exports.CacheTTL.MEDIUM) {
    try {
        const serialized = JSON.stringify(value);
        if ((0, db_1.redisConnected)()) {
            const redis = (0, db_1.getRedis)();
            await redis.setex(key, ttlSeconds, serialized);
        }
        else {
            // Fallback: in-memory
            memCache.set(key, { data: serialized, expiresAt: Date.now() + ttlSeconds * 1000 });
            memCleanup();
        }
    }
    catch (err) {
        logger_1.logger.warn('Cache SET error', { key, error: (0, db_2.toErrorMessage)(err) });
    }
}
/**
 * Delete a specific key.
 */
async function cacheDel(key) {
    try {
        if ((0, db_1.redisConnected)()) {
            await (0, db_1.getRedis)().del(key);
        }
        memCache.delete(key);
    }
    catch (err) {
        logger_1.logger.warn('Cache DEL error', { key, error: (0, db_2.toErrorMessage)(err) });
    }
}
/**
 * Delete all keys matching a pattern (e.g. "lkp:*" to clear all lookups).
 * Uses SCAN to avoid blocking Redis.
 */
async function cacheInvalidatePattern(pattern) {
    let deleted = 0;
    try {
        if ((0, db_1.redisConnected)()) {
            const redis = (0, db_1.getRedis)();
            // Note: keyPrefix is already applied by ioredis, so we scan with raw pattern
            const stream = redis.scanStream({ match: pattern, count: 100 });
            const pipeline = redis.pipeline();
            let batchCount = 0;
            await new Promise((resolve, reject) => {
                stream.on('data', (keys) => {
                    for (const key of keys) {
                        // ioredis scanStream returns keys WITH the prefix, so delete directly
                        pipeline.del(key);
                        batchCount++;
                        deleted++;
                    }
                });
                stream.on('end', async () => {
                    if (batchCount > 0)
                        await pipeline.exec();
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
    }
    catch (err) {
        logger_1.logger.warn('Cache invalidate pattern error', { pattern, error: (0, db_2.toErrorMessage)(err) });
    }
    return deleted;
}
/**
 * Invalidate all keys in a namespace.
 */
async function cacheInvalidateNamespace(ns) {
    return cacheInvalidatePattern(`${ns}*`);
}
/**
 * Invalidate compliance cache for a tenant (overview, frameworks, etc.).
 * Call after compliance writes: gap/remediation/finding/control/evidence/framework/assessment updates.
 */
async function invalidateComplianceCache(tenantId) {
    return cacheInvalidatePattern(`${exports.CacheNS.COMPLIANCE}${tenantId}:*`);
}
/**
 * Get-or-set pattern: returns cached value or calls fetcher, caches result.
 */
async function cacheGetOrSet(key, fetcher, ttlSeconds = exports.CacheTTL.MEDIUM) {
    const cached = await cacheGet(key);
    if (cached !== null)
        return cached;
    const fresh = await fetcher();
    await cacheSet(key, fresh, ttlSeconds);
    return fresh;
}
/**
 * Get-or-set with metadata: returns { data, fromCache } for observability.
 */
async function cacheGetOrSetWithMeta(key, fetcher, ttlSeconds = exports.CacheTTL.MEDIUM) {
    const cached = await cacheGet(key);
    if (cached !== null)
        return { data: cached, fromCache: true };
    const fresh = await fetcher();
    await cacheSet(key, fresh, ttlSeconds);
    return { data: fresh, fromCache: false };
}
/**
 * Flush the entire cache (admin operation).
 */
async function cacheFlushAll() {
    try {
        if ((0, db_1.redisConnected)()) {
            // Only flush keys with our prefix (SCAN + DEL)
            await cacheInvalidatePattern('*');
        }
        memCache.clear();
        logger_1.logger.info('Cache: flushed all');
    }
    catch (err) {
        logger_1.logger.warn('Cache flush error', { error: (0, db_2.toErrorMessage)(err) });
    }
}
/**
 * Get cache stats for monitoring.
 */
async function cacheStats() {
    const stats = {
        backend: (0, db_1.redisConnected)() ? 'redis' : 'memory',
        memoryKeys: memCache.size,
    };
    if ((0, db_1.redisConnected)()) {
        try {
            const redis = (0, db_1.getRedis)();
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
        }
        catch { /* ignore stats errors */ }
    }
    return stats;
}
// ── Helpers ──
function extractInfoValue(info, key) {
    const match = info.match(new RegExp(`^${key}:(.+)$`, 'm'));
    return match ? match[1].trim() : null;
}
function matchGlob(str, pattern) {
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    return regex.test(str);
}
//# sourceMappingURL=cache.service.js.map