"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports._internal = exports.bulkRateLimiter = exports.writeRateLimiter = void 0;
const logger_port_1 = require("../../../ports/logger.port");
// ── In-memory backend ──────────────────────────────────────────────────────
function createMemoryBackend() {
    const buckets = new Map();
    return {
        kind: () => 'memory',
        check: async (key, max, windowMs) => {
            const now = Date.now();
            const bucket = buckets.get(key);
            if (!bucket || bucket.resetAt <= now) {
                buckets.set(key, { count: 1, resetAt: now + windowMs });
                return { ok: true, retryAfterMs: 0 };
            }
            bucket.count += 1;
            if (bucket.count > max) {
                return { ok: false, retryAfterMs: bucket.resetAt - now };
            }
            return { ok: true, retryAfterMs: 0 };
        },
    };
}
// ── Redis backend ──────────────────────────────────────────────────────────
function createRedisBackend() {
    // Lazy-load so tests/CI without a Redis client don't fail at import time.
    let redis = null;
    let initialized = false;
    let initFailed = false;
    const getClient = async () => {
        if (initialized)
            return redis;
        initialized = true;
        try {
            const mod = { getRedis: () => null };
            if (typeof mod.getRedis === 'function') {
                const maybe = await mod.getRedis();
                redis = maybe ?? null;
            }
        }
        catch (err) {
            initFailed = true;
            logger_port_1.logger.warn('[user-service.rate-limiter] Redis backend unavailable, falling back to memory', {
                err: err?.message,
            });
        }
        return redis;
    };
    return {
        kind: () => 'redis',
        check: async (key, max, windowMs) => {
            const client = await getClient();
            if (!client || initFailed) {
                // Fall back to memory within the same request.
                return memoryBackend.check(key, max, windowMs);
            }
            try {
                const count = await client.incr(key);
                if (count === 1) {
                    await client.pexpire(key, windowMs);
                }
                if (count > max) {
                    const ttl = await client.pttl(key);
                    return { ok: false, retryAfterMs: ttl > 0 ? ttl : windowMs };
                }
                return { ok: true, retryAfterMs: 0 };
            }
            catch (err) {
                logger_port_1.logger.warn('[user-service.rate-limiter] Redis check failed, using memory this call', {
                    err: err?.message,
                });
                return memoryBackend.check(key, max, windowMs);
            }
        },
    };
}
const memoryBackend = createMemoryBackend();
function pickBackend() {
    const choice = (process.env.USER_SVC_RATE_LIMIT_BACKEND || 'auto').toLowerCase();
    if (choice === 'memory')
        return memoryBackend;
    if (choice === 'redis' || choice === 'auto') {
        return createRedisBackend() ?? memoryBackend;
    }
    return memoryBackend;
}
const backend = pickBackend();
function makeLimiter(max, windowMs, namespace) {
    return async (req, res, next) => {
        const key = [
            namespace,
            req.tenantId ?? 'no-tenant',
            req.user?.userId ?? req.ip ?? 'anon',
        ].join(':');
        const result = await backend.check(key, max, windowMs);
        if (!result.ok) {
            res.setHeader('Retry-After', Math.ceil(result.retryAfterMs / 1000));
            res.status(429).json({
                error: 'Too many requests',
                code: 'RATE_LIMITED',
                retryAfterMs: result.retryAfterMs,
                backend: backend.kind(),
            });
            return;
        }
        next();
    };
}
const toInt = (raw, fallback) => {
    const n = raw ? parseInt(raw, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : fallback;
};
exports.writeRateLimiter = makeLimiter(toInt(process.env.USER_SVC_WRITE_RATE_MAX, 30), toInt(process.env.USER_SVC_WRITE_RATE_WINDOW_MS, 60_000), 'user-svc:write');
exports.bulkRateLimiter = makeLimiter(toInt(process.env.USER_SVC_BULK_RATE_MAX, 5), toInt(process.env.USER_SVC_BULK_RATE_WINDOW_MS, 60_000), 'user-svc:bulk');
// For tests that need to swap backends
exports._internal = { pickBackend, memoryBackend };
//# sourceMappingURL=rate-limiter.js.map