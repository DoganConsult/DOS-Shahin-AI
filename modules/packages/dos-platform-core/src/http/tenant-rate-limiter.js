"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_TIER_LIMITS = void 0;
exports.tenantAwareRateLimiter = tenantAwareRateLimiter;
const prometheus_service_1 = require("../observability/prometheus.service");
exports.DEFAULT_TIER_LIMITS = {
    free: { maxRequestsPerMinute: 30, maxRequestsPerHour: 500, maxBurstSize: 10, concurrentRequestLimit: 5 },
    starter: { maxRequestsPerMinute: 60, maxRequestsPerHour: 2000, maxBurstSize: 20, concurrentRequestLimit: 10 },
    professional: { maxRequestsPerMinute: 200, maxRequestsPerHour: 10000, maxBurstSize: 50, concurrentRequestLimit: 25 },
    enterprise: { maxRequestsPerMinute: 1000, maxRequestsPerHour: 50000, maxBurstSize: 200, concurrentRequestLimit: 100 },
    unlimited: { maxRequestsPerMinute: Infinity, maxRequestsPerHour: Infinity, maxBurstSize: Infinity, concurrentRequestLimit: Infinity },
};
const memoryBuckets = new Map();
let _redis = null;
let _redisAvailable = false;
function getRedisClient() {
    if (_redis !== null)
        return _redisAvailable ? _redis : null;
    try {
        const { getRedis, redisConnected } = require('@dos/db');
        _redis = getRedis();
        _redisAvailable = redisConnected();
        return _redisAvailable ? _redis : null;
    }
    catch {
        _redis = false;
        _redisAvailable = false;
        return null;
    }
}
function getEffectiveLimits(tier, overrides) {
    const base = exports.DEFAULT_TIER_LIMITS[tier];
    const override = overrides?.[tier];
    if (!override)
        return base;
    return { ...base, ...override };
}
function tenantAwareRateLimiter(config) {
    const extractTenantId = config.tenantIdExtractor || ((req) => req.user?.tenantId || req.headers['x-tenant-id'] || 'anonymous');
    return async (req, res, next) => {
        if (config.bypassCheck?.(req)) {
            next();
            return;
        }
        const tenantId = extractTenantId(req);
        const tier = await config.tierResolver(req);
        const limits = getEffectiveLimits(tier, config.tierLimits);
        if (tier === 'unlimited') {
            next();
            return;
        }
        const result = await checkAndConsume(tenantId, limits);
        (0, prometheus_service_1.recordRateLimitCheck)('tenant', tier);
        res.setHeader('X-RateLimit-Limit-Minute', limits.maxRequestsPerMinute);
        res.setHeader('X-RateLimit-Remaining-Minute', result.remainingMinute);
        res.setHeader('X-RateLimit-Limit-Hour', limits.maxRequestsPerHour);
        res.setHeader('X-RateLimit-Remaining-Hour', result.remainingHour);
        res.setHeader('X-RateLimit-Tier', tier);
        if (!result.allowed) {
            (0, prometheus_service_1.recordRateLimitRejection)('tenant', tier);
            config.onRateLimited?.(tenantId, tier, req);
            res.setHeader('Retry-After', result.retryAfterSeconds);
            res.status(429).json({
                error: 'Rate limit exceeded',
                code: 'TENANT_RATE_LIMIT_EXCEEDED',
                tier,
                retryAfterSeconds: result.retryAfterSeconds,
                limits: {
                    perMinute: limits.maxRequestsPerMinute,
                    perHour: limits.maxRequestsPerHour,
                },
            });
            return;
        }
        next();
    };
}
async function checkAndConsume(tenantId, limits) {
    const redis = getRedisClient();
    if (redis) {
        try {
            return await redisCheckAndConsume(redis, tenantId, limits);
        }
        catch {
            // fall through
        }
    }
    return memoryCheckAndConsume(tenantId, limits);
}
async function redisCheckAndConsume(redis, tenantId, limits) {
    const now = Date.now();
    const minuteKey = `trl:${tenantId}:min`;
    const hourKey = `trl:${tenantId}:hr`;
    const luaScript = `
    local minuteKey = KEYS[1]
    local hourKey = KEYS[2]
    local maxMinute = tonumber(ARGV[1])
    local maxHour = tonumber(ARGV[2])
    local now = tonumber(ARGV[3])

    local minuteCount = redis.call('INCR', minuteKey)
    if minuteCount == 1 then
      redis.call('PEXPIRE', minuteKey, 60000)
    end

    local hourCount = redis.call('INCR', hourKey)
    if hourCount == 1 then
      redis.call('PEXPIRE', hourKey, 3600000)
    end

    if minuteCount > maxMinute or hourCount > maxHour then
      redis.call('DECR', minuteKey)
      redis.call('DECR', hourKey)
      local minuteTTL = redis.call('PTTL', minuteKey)
      local hourTTL = redis.call('PTTL', hourKey)
      local retryMs = minuteCount > maxMinute and minuteTTL or hourTTL
      return {0, maxMinute - minuteCount + 1, maxHour - hourCount + 1, retryMs}
    end

    return {1, maxMinute - minuteCount, maxHour - hourCount, 0}
  `;
    const result = await redis.eval(luaScript, 2, minuteKey, hourKey, String(limits.maxRequestsPerMinute), String(limits.maxRequestsPerHour), String(now));
    return {
        allowed: result[0] === 1,
        remainingMinute: Math.max(0, result[1]),
        remainingHour: Math.max(0, result[2]),
        retryAfterSeconds: Math.ceil(Math.max(0, result[3]) / 1000),
    };
}
function memoryCheckAndConsume(tenantId, limits) {
    const now = Date.now();
    let bucket = memoryBuckets.get(tenantId);
    if (!bucket) {
        bucket = {
            minuteTokens: limits.maxRequestsPerMinute,
            hourTokens: limits.maxRequestsPerHour,
            minuteResetAt: now + 60_000,
            hourResetAt: now + 3600_000,
            concurrent: 0,
        };
        memoryBuckets.set(tenantId, bucket);
    }
    if (now >= bucket.minuteResetAt) {
        bucket.minuteTokens = limits.maxRequestsPerMinute;
        bucket.minuteResetAt = now + 60_000;
    }
    if (now >= bucket.hourResetAt) {
        bucket.hourTokens = limits.maxRequestsPerHour;
        bucket.hourResetAt = now + 3600_000;
    }
    if (bucket.minuteTokens <= 0 || bucket.hourTokens <= 0) {
        const retryMs = bucket.minuteTokens <= 0
            ? bucket.minuteResetAt - now
            : bucket.hourResetAt - now;
        return {
            allowed: false,
            remainingMinute: Math.max(0, bucket.minuteTokens),
            remainingHour: Math.max(0, bucket.hourTokens),
            retryAfterSeconds: Math.ceil(Math.max(0, retryMs) / 1000),
        };
    }
    bucket.minuteTokens--;
    bucket.hourTokens--;
    return {
        allowed: true,
        remainingMinute: bucket.minuteTokens,
        remainingHour: bucket.hourTokens,
        retryAfterSeconds: 0,
    };
}
//# sourceMappingURL=tenant-rate-limiter.js.map