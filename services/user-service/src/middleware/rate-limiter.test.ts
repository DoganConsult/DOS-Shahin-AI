import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.hoisted(() => {
  // Force memory backend BEFORE rate-limiter.ts is evaluated (import order).
  process.env.USER_SVC_RATE_LIMIT_BACKEND = 'memory';
});

vi.mock('@dos/db', () => ({
  getRedis: vi.fn(() => null),
}));

vi.mock('@dos/module-sdk', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import { writeRateLimiter, bulkRateLimiter } from './rate-limiter';

function mkReq(tenantId: string = 't1', userId: string = 'u1'): any {
  return { tenantId, user: { userId }, ip: '127.0.0.1' };
}

function mkRes(): any {
  const headers: Record<string, string> = {};
  const res: any = {
    statusCode: 200,
    setHeader: (k: string, v: any) => { headers[k] = String(v); return res; },
    status: (code: number) => { res.statusCode = code; return res; },
    json: vi.fn(function (this: any, body: any) { res.body = body; return this; }),
    headers,
  };
  return res;
}

async function hit(limiter: any, req: any, res: any = mkRes()): Promise<any> {
  const next = vi.fn();
  await limiter(req, res, next);
  return { res, next };
}

describe('rate-limiter', () => {
  beforeEach(() => {
    delete process.env.USER_SVC_WRITE_RATE_MAX;
  });

  it('writeRateLimiter admits first 30 requests within the window', async () => {
    const req = mkReq('t-admit', 'u-admit');
    for (let i = 0; i < 30; i += 1) {
      const { next } = await hit(writeRateLimiter, req);
      expect(next).toHaveBeenCalled();
    }
  });

  it('writeRateLimiter rejects the 31st request for the same key with 429', async () => {
    const req = mkReq('t-hot', 'u-hot');
    for (let i = 0; i < 30; i += 1) await hit(writeRateLimiter, req);
    const { res } = await hit(writeRateLimiter, req);
    expect(res.statusCode).toBe(429);
    expect(res.body.code).toBe('RATE_LIMITED');
    expect(res.headers['Retry-After']).toBeDefined();
  });

  it('different keys are independent', async () => {
    for (let i = 0; i < 30; i += 1) await hit(writeRateLimiter, mkReq('t-a', 'u-a'));
    const { res } = await hit(writeRateLimiter, mkReq('t-b', 'u-b'));
    expect(res.statusCode).toBe(200);
  });

  it('bulkRateLimiter has stricter default (5 per window)', async () => {
    const req = mkReq('t-bulk', 'u-bulk');
    for (let i = 0; i < 5; i += 1) await hit(bulkRateLimiter, req);
    const { res } = await hit(bulkRateLimiter, req);
    expect(res.statusCode).toBe(429);
  });

  it('key falls back to IP when no user / tenant', async () => {
    const req: any = { ip: '9.9.9.9' };
    const { next } = await hit(writeRateLimiter, req);
    expect(next).toHaveBeenCalled();
  });

  it('key falls back to "anon" when no user/ip', async () => {
    const req: any = {};
    const { next } = await hit(writeRateLimiter, req);
    expect(next).toHaveBeenCalled();
  });

  it('emits Retry-After header as seconds', async () => {
    const req = mkReq('t-ra', 'u-ra');
    for (let i = 0; i < 30; i += 1) await hit(writeRateLimiter, req);
    const { res } = await hit(writeRateLimiter, req);
    expect(Number(res.headers['Retry-After'])).toBeGreaterThanOrEqual(0);
    expect(res.body.backend).toBe('memory');
  });
});
