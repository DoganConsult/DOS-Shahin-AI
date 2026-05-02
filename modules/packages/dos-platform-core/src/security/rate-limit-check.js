"use strict";
/**
 * Programmatic Redis sliding-window rate-limit check — usable inside
 * application/command handlers (not just as Express middleware).
 *
 * Extracted behaviour from platform/dos/http/rate-limiting/rate-limiter.ts
 * but exposes a single `checkRateLimit()` function so commands like
 * `register-tenant-user` can precheck BEFORE running advisory locks or
 * opening a DB transaction.
 *
 * Fail mode:
 *   - If Redis is unavailable, result.allowed=true and result.degraded=true —
 *     edge middleware (gateway) and WAF are the authoritative rate-limit;
 *     this in-command check is defence-in-depth. Caller decides whether to
 *     reject on degraded.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkRateLimit = checkRateLimit;
exports.rateLimitKey = rateLimitKey;
const SLIDING_WINDOW_LUA = `
  local key = KEYS[1]
  local windowStart = tonumber(ARGV[1])
  local maxRequests = tonumber(ARGV[2])
  local now = tonumber(ARGV[3])
  local windowMs = tonumber(ARGV[4])
  redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
  local count = redis.call('ZCARD', key)
  if count < maxRequests then
    redis.call('ZADD', key, now, now .. ':' .. math.random(1, 1000000))
    redis.call('PEXPIRE', key, windowMs)
    return {1, maxRequests - count - 1, 0}
  else
    local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
    local retryMs = 0
    if #oldest >= 2 then
      retryMs = tonumber(oldest[2]) + windowMs - now
    end
    return {0, 0, retryMs}
  end
`;
async function checkRateLimit(redis, input) {
    if (!redis) {
        return { allowed: true, remaining: input.maxRequests, retryAfterSeconds: 0, degraded: true };
    }
    const now = Date.now();
    const windowStart = now - input.windowMs;
    const redisKey = `ratelimit:cmd:${input.key}`;
    try {
        const raw = (await redis.eval(SLIDING_WINDOW_LUA, 1, redisKey, String(windowStart), String(input.maxRequests), String(now), String(input.windowMs)));
        return {
            allowed: raw[0] === 1,
            remaining: Math.max(0, raw[1]),
            retryAfterSeconds: Math.ceil(Math.max(0, raw[2]) / 1000),
            degraded: false,
        };
    }
    catch {
        return { allowed: true, remaining: input.maxRequests, retryAfterSeconds: 0, degraded: true };
    }
}
/** Hash-normalises a value (email/ip) so keys stay opaque + bounded-length. */
function rateLimitKey(parts) {
    return parts
        .filter((p) => typeof p === 'string' && p.length > 0)
        .map((p) => p.toLowerCase().trim())
        .join(':');
}
//# sourceMappingURL=rate-limit-check.js.map