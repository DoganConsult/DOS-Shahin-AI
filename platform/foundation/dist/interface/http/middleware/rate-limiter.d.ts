/**
 * Rate limiting for user-service write endpoints.
 *
 * - Default: Redis-backed sliding window (shared across replicas) when
 *   REDIS_URL is configured via @dos/db's getRedis().
 * - Fallback: in-memory sliding window. Per-replica only — acceptable for
 *   dev and single-instance deployments.
 *
 * Limits configurable per env:
 *   USER_SVC_WRITE_RATE_MAX         (default 30 per window)
 *   USER_SVC_WRITE_RATE_WINDOW_MS   (default 60_000)
 *   USER_SVC_BULK_RATE_MAX          (default 5 per window)
 *   USER_SVC_BULK_RATE_WINDOW_MS    (default 60_000)
 *   USER_SVC_RATE_LIMIT_BACKEND     ('redis' | 'memory' | 'auto', default auto)
 */
import type { Request, Response, NextFunction } from 'express';
interface LimiterBackend {
    check(key: string, max: number, windowMs: number): Promise<{
        ok: boolean;
        retryAfterMs: number;
    }>;
    kind(): 'redis' | 'memory';
}
declare function pickBackend(): LimiterBackend;
export declare const writeRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const bulkRateLimiter: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const _internal: {
    pickBackend: typeof pickBackend;
    memoryBackend: LimiterBackend;
};
export {};
