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
import type { Redis } from 'ioredis';
export interface RateLimitCheckInput {
    key: string;
    maxRequests: number;
    windowMs: number;
}
export interface RateLimitCheckResult {
    allowed: boolean;
    remaining: number;
    retryAfterSeconds: number;
    degraded: boolean;
}
export declare function checkRateLimit(redis: Redis | null | undefined, input: RateLimitCheckInput): Promise<RateLimitCheckResult>;
/** Hash-normalises a value (email/ip) so keys stay opaque + bounded-length. */
export declare function rateLimitKey(parts: Array<string | undefined | null>): string;
