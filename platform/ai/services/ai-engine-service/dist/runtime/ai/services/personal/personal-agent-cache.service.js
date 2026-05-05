import { logger } from '../../ports/logger.port';
/**
 * Personal Agent Cache Service — Production-Grade Performance Layer
 *
 * Provides Redis-backed caching for:
 * - Dashboard summary queries (TTL: 5 minutes)
 * - Audit trail queries (TTL: 2 minutes)
 * - Timeline queries (TTL: 3 minutes)
 * - User assignment lookups (TTL: 10 minutes)
 *
 * Per Platform Operating System Governance Framework:
 * - Configuration-driven (cache TTLs from tenant config)
 * - Tenant-scoped cache keys
 * - Cache invalidation on writes
 * - Graceful degradation if Redis unavailable
 */
let createClient;
try {
    ({ createClient } = require('redis'));
}
catch {
    createClient = null;
}
import { toErrorMessage } from '@dos/module-sdk';
let redisClient = null;
let redisEnabled = false;
// Initialize Redis client (lazy, non-blocking)
async function initRedis() {
    if (redisClient)
        return;
    const redisUrl = process.env.REDIS_URL || process.env.REDIS_CONNECTION_STRING;
    if (!redisUrl) {
        logger.warn('[PersonalAgentCache] Redis not configured — caching disabled');
        return;
    }
    try {
        redisClient = createClient({ url: redisUrl });
        redisClient.on('error', (err) => {
            logger.error('[PersonalAgentCache] Redis error:', toErrorMessage(err));
            redisEnabled = false;
        });
        await redisClient.connect();
        redisEnabled = true;
        logger.info('[PersonalAgentCache] Redis connected');
    }
    catch (err) {
        logger.warn('[PersonalAgentCache] Redis connection failed — caching disabled:', toErrorMessage(err));
        redisEnabled = false;
    }
}
// Cache key builders (tenant-scoped)
function cacheKey(tenantId, type, ...parts) {
    return `personal_agent:${tenantId}:${type}:${parts.join(':')}`;
}
// Cache TTLs (configurable, defaults)
const CACHE_TTLS = {
    dashboard_summary: parseInt(process.env.PERSONAL_AGENT_CACHE_TTL_DASHBOARD || '300', 10), // 5 min
    audit_trail: parseInt(process.env.PERSONAL_AGENT_CACHE_TTL_AUDIT || '120', 10), // 2 min
    timeline: parseInt(process.env.PERSONAL_AGENT_CACHE_TTL_TIMELINE || '180', 10), // 3 min
    assignment: parseInt(process.env.PERSONAL_AGENT_CACHE_TTL_ASSIGNMENT || '600', 10), // 10 min
};
/**
 * Get cached dashboard summary
 */
export async function getCachedDashboardSummary(tenantId, userId, dateRange) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return null;
    }
    try {
        const key = cacheKey(tenantId, 'dashboard', userId || 'all', dateRange?.start || '', dateRange?.end || '');
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (err) {
        logger.warn('[PersonalAgentCache] Get dashboard cache error:', toErrorMessage(err));
        return null;
    }
}
/**
 * Set cached dashboard summary
 */
export async function setCachedDashboardSummary(tenantId, data, userId, dateRange) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return;
    }
    try {
        const key = cacheKey(tenantId, 'dashboard', userId || 'all', dateRange?.start || '', dateRange?.end || '');
        await redisClient.setEx(key, CACHE_TTLS.dashboard_summary, JSON.stringify(data));
    }
    catch (err) {
        // Non-blocking: cache failure should not break queries
        logger.warn('[PersonalAgentCache] Set dashboard cache error:', toErrorMessage(err));
    }
}
/**
 * Invalidate dashboard cache for tenant/user
 */
export async function invalidateDashboardCache(tenantId, userId) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return;
    }
    try {
        const pattern = cacheKey(tenantId, 'dashboard', userId || '*', '*', '*');
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    }
    catch (err) {
        logger.warn('[PersonalAgentCache] Invalidate dashboard cache error:', toErrorMessage(err));
    }
}
/**
 * Get cached audit trail
 */
export async function getCachedAuditTrail(tenantId, cacheKeyParts) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return null;
    }
    try {
        const key = cacheKey(tenantId, 'audit', cacheKeyParts);
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (_err) {
        return null;
    }
}
/**
 * Set cached audit trail
 */
export async function setCachedAuditTrail(tenantId, cacheKeyParts, data) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return;
    }
    try {
        const key = cacheKey(tenantId, 'audit', cacheKeyParts);
        await redisClient.setEx(key, CACHE_TTLS.audit_trail, JSON.stringify(data));
    }
    catch (_err) {
        // Non-blocking
    }
}
/**
 * Invalidate audit trail cache for tenant
 */
export async function invalidateAuditTrailCache(tenantId) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return;
    }
    try {
        const pattern = cacheKey(tenantId, 'audit', '*');
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    }
    catch (_err) {
        // Non-blocking
    }
}
/**
 * Get cached timeline
 */
export async function getCachedTimeline(tenantId, userId, days) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return null;
    }
    try {
        const key = cacheKey(tenantId, 'timeline', userId || 'all', days?.toString() || '7');
        const cached = await redisClient.get(key);
        return cached ? JSON.parse(cached) : null;
    }
    catch (_err) {
        return null;
    }
}
/**
 * Set cached timeline
 */
export async function setCachedTimeline(tenantId, data, userId, days) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return;
    }
    try {
        const key = cacheKey(tenantId, 'timeline', userId || 'all', days?.toString() || '7');
        await redisClient.setEx(key, CACHE_TTLS.timeline, JSON.stringify(data));
    }
    catch (_err) {
        // Non-blocking
    }
}
/**
 * Invalidate timeline cache for tenant/user
 */
export async function invalidateTimelineCache(tenantId, userId) {
    if (!redisEnabled) {
        await initRedis();
        if (!redisEnabled)
            return;
    }
    try {
        const pattern = cacheKey(tenantId, 'timeline', userId || '*', '*');
        const keys = await redisClient.keys(pattern);
        if (keys.length > 0) {
            await redisClient.del(keys);
        }
    }
    catch (_err) {
        // Non-blocking
    }
}
/**
 * Invalidate all personal agent caches for a tenant
 * Called after activity creation, approval, rejection, or assignment changes
 */
export async function invalidateAllCaches(tenantId, userId) {
    await Promise.all([
        invalidateDashboardCache(tenantId, userId),
        invalidateAuditTrailCache(tenantId),
        invalidateTimelineCache(tenantId, userId),
    ]);
}
/**
 * Health check: verify Redis connectivity
 */
export async function checkCacheHealth() {
    if (!redisEnabled) {
        await initRedis();
    }
    if (!redisEnabled || !redisClient) {
        return { healthy: false, redisEnabled: false, error: 'Redis not configured or unavailable' };
    }
    try {
        await redisClient.ping();
        return { healthy: true, redisEnabled: true };
    }
    catch (err) {
        return { healthy: false, redisEnabled: true, error: toErrorMessage(err) };
    }
}
//# sourceMappingURL=personal-agent-cache.service.js.map