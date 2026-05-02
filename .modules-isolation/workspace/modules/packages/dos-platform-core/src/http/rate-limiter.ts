import { Request, Response, NextFunction } from 'express';
import { recordRateLimitCheck, recordRateLimitRejection } from '../observability/prometheus.service';

export interface RateLimiterOptions {
  namespace?: string;
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (req: Request) => string;
}

interface WindowEntry {
  timestamps: number[];
}

const memoryStore = new Map<string, WindowEntry>();

let _redis: any = null;
let _redisAvailable = false;

function getRedisClient(): any {
  if (_redis !== null) return _redisAvailable ? _redis : null;
  try {
    const { getRedis, redisConnected } = require('@dos/db');
    _redis = getRedis();
    _redisAvailable = redisConnected();
    setInterval(() => {
      try {
        const { redisConnected: rc } = require('@dos/db');
        _redisAvailable = rc();
      } catch { _redisAvailable = false; }
    }, 10_000).unref();
    return _redisAvailable ? _redis : null;
  } catch {
    _redis = false;
    _redisAvailable = false;
    return null;
  }
}

async function redisCheck(key: string, maxRequests: number, windowMs: number): Promise<{ allowed: boolean; remaining: number; retryAfterSeconds: number }> {
  const redis = getRedisClient();
  if (!redis) throw new Error('Redis unavailable');

  const now = Date.now();
  const windowStart = now - windowMs;
  const redisKey = `ratelimit:${key}`;

  const luaScript = `
    redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', ARGV[1])
    local count = redis.call('ZCARD', KEYS[1])
    if count < tonumber(ARGV[2]) then
      redis.call('ZADD', KEYS[1], ARGV[3], ARGV[3] .. ':' .. math.random(1000000))
      redis.call('PEXPIRE', KEYS[1], ARGV[4])
      return {1, tonumber(ARGV[2]) - count - 1, 0}
    else
      local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
      local retryMs = 0
      if #oldest >= 2 then
        retryMs = tonumber(oldest[2]) + tonumber(ARGV[4]) - tonumber(ARGV[3])
      end
      return {0, 0, retryMs}
    end
  `;

  const result = await redis.eval(luaScript, 1, redisKey,
    String(windowStart), String(maxRequests), String(now), String(windowMs));

  return {
    allowed: result[0] === 1,
    remaining: result[1],
    retryAfterSeconds: Math.ceil(Math.max(0, result[2]) / 1000),
  };
}

function memoryCheck(key: string, maxRequests: number, windowMs: number): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = memoryStore.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    memoryStore.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);

  if (entry.timestamps.length < maxRequests) {
    entry.timestamps.push(now);
    return { allowed: true, remaining: maxRequests - entry.timestamps.length, retryAfterSeconds: 0 };
  }

  const oldest = entry.timestamps[0] || now;
  const retryMs = oldest + windowMs - now;
  return { allowed: false, remaining: 0, retryAfterSeconds: Math.ceil(Math.max(0, retryMs) / 1000) };
}

export function createRateLimiter(options: RateLimiterOptions) {
  const { namespace = 'default', maxRequests, windowMs, keyGenerator } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const clientKey = keyGenerator
      ? keyGenerator(req)
      : `${namespace}:${req.ip || req.headers['x-forwarded-for'] || 'unknown'}`;

    let result: { allowed: boolean; remaining: number; retryAfterSeconds: number };

    try {
      result = await redisCheck(clientKey, maxRequests, windowMs);
    } catch {
      result = memoryCheck(clientKey, maxRequests, windowMs);
    }

    recordRateLimitCheck(namespace);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', result.remaining);

    if (!result.allowed) {
      recordRateLimitRejection(namespace);
      res.setHeader('Retry-After', result.retryAfterSeconds);
      res.status(429).json({
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfterSeconds: result.retryAfterSeconds,
      });
      return;
    }

    next();
  };
}

export const rateLimiter = createRateLimiter;

export function authRateLimiter(overrides?: Partial<RateLimiterOptions>) {
  return createRateLimiter({
    namespace: 'auth',
    maxRequests: 10,
    windowMs: 60_000,
    ...overrides,
  });
}

export function moduleRateLimiter(moduleCode: string, overrides?: Partial<RateLimiterOptions>) {
  return createRateLimiter({
    namespace: `module:${moduleCode}`,
    maxRequests: 60,
    windowMs: 60_000,
    ...overrides,
  });
}

export function tenantRateLimiter(overrides?: Partial<RateLimiterOptions>) {
  return createRateLimiter({
    namespace: 'tenant',
    maxRequests: 200,
    windowMs: 60_000,
    keyGenerator: (req) => (req as any).user?.tenantId || req.ip || 'anon',
    ...overrides,
  });
}
