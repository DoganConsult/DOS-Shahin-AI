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
import { logger } from '@dos/module-sdk';

interface Bucket {
  count: number;
  resetAt: number;
}

interface LimiterBackend {
  check(key: string, max: number, windowMs: number): Promise<{ ok: boolean; retryAfterMs: number }>;
  kind(): 'redis' | 'memory';
}

// ── In-memory backend ──────────────────────────────────────────────────────

function createMemoryBackend(): LimiterBackend {
  const buckets = new Map<string, Bucket>();

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

function createRedisBackend(): LimiterBackend | null {
  // Lazy-load so tests/CI without a Redis client don't fail at import time.
  let redis: { incr: (key: string) => Promise<number>; pexpire: (key: string, ms: number) => Promise<number>; pttl: (key: string) => Promise<number> } | null = null;
  let initialized = false;
  let initFailed = false;

  const getClient = async () => {
    if (initialized) return redis;
    initialized = true;
    try {
      const mod: any = await import('@dos/db');
      if (typeof mod.getRedis === 'function') {
        const maybe = await mod.getRedis();
        redis = maybe ?? null;
      }
    } catch (err) {
      initFailed = true;
      logger.warn('[user-service.rate-limiter] Redis backend unavailable, falling back to memory', {
        err: (err as Error)?.message,
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
      } catch (err) {
        logger.warn('[user-service.rate-limiter] Redis check failed, using memory this call', {
          err: (err as Error)?.message,
        });
        return memoryBackend.check(key, max, windowMs);
      }
    },
  };
}

const memoryBackend: LimiterBackend = createMemoryBackend();

function pickBackend(): LimiterBackend {
  const choice = (process.env.USER_SVC_RATE_LIMIT_BACKEND || 'auto').toLowerCase();
  if (choice === 'memory') return memoryBackend;
  if (choice === 'redis' || choice === 'auto') {
    return createRedisBackend() ?? memoryBackend;
  }
  return memoryBackend;
}

const backend = pickBackend();

function makeLimiter(max: number, windowMs: number, namespace: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
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

const toInt = (raw: string | undefined, fallback: number): number => {
  const n = raw ? parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

export const writeRateLimiter = makeLimiter(
  toInt(process.env.USER_SVC_WRITE_RATE_MAX, 30),
  toInt(process.env.USER_SVC_WRITE_RATE_WINDOW_MS, 60_000),
  'user-svc:write',
);

export const bulkRateLimiter = makeLimiter(
  toInt(process.env.USER_SVC_BULK_RATE_MAX, 5),
  toInt(process.env.USER_SVC_BULK_RATE_WINDOW_MS, 60_000),
  'user-svc:bulk',
);

// For tests that need to swap backends
export const _internal = { pickBackend, memoryBackend };
