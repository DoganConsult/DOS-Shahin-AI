/**
 * Hardening middleware (W63) — production-grade composite-level middlewares
 * mounted on `/api/compliance` before any sub-routers:
 *
 *   1. Request-ID — accepts inbound `x-request-id`, falls back to a generated
 *      ULID-like id, echoes the resolved value via `x-request-id` response
 *      header, and exposes it on `res.locals.requestId`.
 *
 *   2. Rate-limit — fixed-window in-memory limiter keyed by the composition of
 *      tenant + ip + route, bounded by `windowMs` and `max`. Returns 429 with
 *      `retry-after` header on threshold breach. Counter resets per window.
 *      Exposes a `prune()` helper for callers/tests to free memory.
 */
import type { RequestHandler, Request, Response, NextFunction } from 'express';
import { incCounter } from '../observability/metrics';

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';
function generateRequestId(): string {
  const t = Date.now().toString(36);
  let rand = '';
  for (let i = 0; i < 12; i++) rand += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return `req_${t}_${rand}`;
}

export interface RequestIdOptions {
  header?: string;
  generator?: () => string;
}

export function requestIdMiddleware(opts: RequestIdOptions = {}): RequestHandler {
  const headerName = (opts.header ?? 'x-request-id').toLowerCase();
  const gen = opts.generator ?? generateRequestId;
  return (req: Request, res: Response, next: NextFunction): void => {
    const inbound = req.headers[headerName];
    const id = (typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 200)
      ? inbound : gen();
    res.locals.requestId = id;
    res.setHeader('x-request-id', id);
    incCounter('compliance_request_id_total', 1, {});
    next();
  };
}

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  /** Resolves the limiter key from the request. Defaults to ip+route+tenant header. */
  keyResolver?: (req: Request) => string;
  /** Skip-list returning true to bypass the limiter for this request. */
  skip?: (req: Request) => boolean;
  /** Test-injectable clock. */
  now?: () => number;
}

export interface RateLimitMiddleware extends RequestHandler {
  prune: () => void;
  size: () => number;
}

interface Bucket { count: number; resetAt: number; }

export function rateLimitMiddleware(opts: RateLimitOptions = {}): RateLimitMiddleware {
  const windowMs = Math.max(opts.windowMs ?? 60_000, 1);
  const max = Math.max(opts.max ?? 600, 1);
  const now = opts.now ?? (() => Date.now());
  const skip = opts.skip ?? (() => false);
  const resolveKey = opts.keyResolver ?? ((req: Request) => {
    const tenant = (req.headers['x-tenant-id'] ?? 'anon') as string;
    const ip = (req.ip ?? req.socket?.remoteAddress ?? 'unknown') as string;
    return `${tenant}|${ip}|${req.method}|${req.baseUrl}${req.path}`;
  });
  const buckets = new Map<string, Bucket>();

  const handler = ((req: Request, res: Response, next: NextFunction): void => {
    if (skip(req)) { next(); return; }
    const key = resolveKey(req);
    const t = now();
    let b = buckets.get(key);
    if (!b || b.resetAt <= t) {
      b = { count: 0, resetAt: t + windowMs };
      buckets.set(key, b);
    }
    b.count++;
    const remaining = Math.max(max - b.count, 0);
    res.setHeader('x-ratelimit-limit', String(max));
    res.setHeader('x-ratelimit-remaining', String(remaining));
    res.setHeader('x-ratelimit-reset', String(Math.ceil(b.resetAt / 1000)));
    if (b.count > max) {
      const retryAfter = Math.max(Math.ceil((b.resetAt - t) / 1000), 1);
      res.setHeader('retry-after', String(retryAfter));
      incCounter('compliance_rate_limit_blocks_total', 1, {});
      res.status(429).json({ error: { code: 'rate_limited', message: `rate limit exceeded; retry after ${retryAfter}s` } });
      return;
    }
    incCounter('compliance_rate_limit_allows_total', 1, {});
    next();
  }) as RateLimitMiddleware;

  handler.prune = (): void => {
    const t = now();
    for (const [k, b] of buckets) if (b.resetAt <= t) buckets.delete(k);
  };
  handler.size = (): number => buckets.size;

  return handler;
}
