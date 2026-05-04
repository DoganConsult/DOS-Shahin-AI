/**
 * DOS Master L37-C (Phase 4) — per-tenant Redis sliding-window rate limit.
 *
 * Doctrine §15 invariant 4: customer-zone gateway routes MUST honour the
 * `rate_limit_per_minute` value from `dos.platform_session_policy`,
 * enforced via a Redis sliding-window counter keyed by tenant_id.
 *
 * Algorithm: ZADD <key> <now> <uuid>; ZREMRANGEBYSCORE <key> 0 <now-60s>;
 * ZCARD <key>; if > limit → 429. TTL on the key keeps it bounded.
 *
 * Trust-zone routing: only mounted on customer-zone routes (`/api/auth/*`,
 * `/api/public/*`). Admin + tenant zones use their own throttles.
 *
 * Kill-switch: TENANT_RATE_LIMIT_ENFORCE !== '1' → middleware passes
 * through (Article 5: never half-enforce when policy DDL or Redis unset).
 */
import type { Request, Response, NextFunction } from 'express';
import IORedis from 'ioredis';
import pg from 'pg';
import { randomUUID } from 'node:crypto';

const ENFORCE = String(process.env.TENANT_RATE_LIMIT_ENFORCE ?? '0').trim() === '1';
const REDIS_URL = process.env.RATE_LIMIT_REDIS_URL || process.env.REDIS_URL;
const PG_URL    = process.env.DATABASE_URL;
const KEY_PREFIX = process.env.RATE_LIMIT_PREFIX || 'dos:rl:';
const WINDOW_MS = 60_000;

let _redis: IORedis | null = null;
let _policyCache: Record<string, { rate_limit_per_minute: number }> = {};
let _policyLoadedAt = 0;
const POLICY_TTL_MS = 60_000;

function _getRedis(): IORedis | null {
  if (!ENFORCE) return null;
  if (!REDIS_URL) return null;
  if (_redis) return _redis;
  try {
    _redis = new IORedis(REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false, lazyConnect: false });
    _redis.on('error', (e) => console.warn('[tenant-rate-limit] redis error', e.message));
    return _redis;
  } catch (e) {
    console.warn('[tenant-rate-limit] redis unavailable', (e as Error).message);
    return null;
  }
}

async function _loadPolicy(): Promise<Record<string, { rate_limit_per_minute: number }>> {
  const now = Date.now();
  if (now - _policyLoadedAt < POLICY_TTL_MS && Object.keys(_policyCache).length) return _policyCache;
  if (!PG_URL) return _policyCache;
  const c = new pg.Client({ connectionString: PG_URL });
  try {
    await c.connect();
    const r = await c.query(`SELECT trust_zone, rate_limit_per_minute FROM dos.platform_session_policy`);
    const next: Record<string, { rate_limit_per_minute: number }> = {};
    for (const row of r.rows) next[row.trust_zone] = { rate_limit_per_minute: Number(row.rate_limit_per_minute) };
    _policyCache = next;
    _policyLoadedAt = now;
  } catch (e) {
    console.warn('[tenant-rate-limit] policy load failed', (e as Error).message);
  } finally {
    try { await c.end(); } catch {}
  }
  return _policyCache;
}

function _resolveTenantId(req: Request): string {
  // Prefer JWT principal (already verified upstream by authGuard); fall back to
  // x-tenant-id header for unauthenticated public routes; final fallback to IP.
  const p = (req as any).principal as { tenant_id?: string } | undefined;
  if (p?.tenant_id) return `t:${p.tenant_id}`;
  const h = String(req.headers['x-tenant-id'] || '').trim();
  if (h) return `t:${h}`;
  const ip = (req.ip || (req.socket && req.socket.remoteAddress) || 'unknown').toString();
  return `ip:${ip}`;
}

export function tenantRateLimit(zone: 'admin' | 'tenant' | 'customer') {
  return async function _tenantRateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    if (!ENFORCE) return next();
    const r = _getRedis();
    if (!r) return next();
    const policy = await _loadPolicy();
    const limit = policy[zone]?.rate_limit_per_minute ?? 600;
    const tenant = _resolveTenantId(req);
    const key = `${KEY_PREFIX}${zone}:${tenant}`;
    const now = Date.now();
    try {
      const pipe = r.multi();
      pipe.zadd(key, now, `${now}-${randomUUID()}`);
      pipe.zremrangebyscore(key, 0, now - WINDOW_MS);
      pipe.zcard(key);
      pipe.pexpire(key, WINDOW_MS * 2);
      const out = await pipe.exec();
      const count = Number((out?.[2]?.[1] as number) || 0);
      res.setHeader('X-RateLimit-Limit', String(limit));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(0, limit - count)));
      res.setHeader('X-RateLimit-Window', '60');
      if (count > limit) {
        res.setHeader('Retry-After', '60');
        res.status(429).json({ error: 'RATE_LIMITED', zone, limit, window_seconds: 60 });
        return;
      }
    } catch (e) {
      console.warn('[tenant-rate-limit] redis op failed', (e as Error).message);
    }
    return next();
  };
}
