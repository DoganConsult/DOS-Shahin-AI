import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { bootstrapDNOCPlatformPort } from '../dnoc-port.bootstrap';
import { getDNOCPort, resetDNOCPort } from '@dos/dnoc-core';

beforeEach(() => resetDNOCPort());
afterEach(() => resetDNOCPort());

describe('bootstrapDNOCPlatformPort', () => {
  it('binds the DNOCPort singleton with all 5 methods', () => {
    expect(() => getDNOCPort()).toThrow(/has not been instantiated/);
    const query = vi.fn(async () => ({ rows: [{ c: 0 }] as any[] }));
    bootstrapDNOCPlatformPort({ query });
    const port = getDNOCPort();
    expect(typeof port.recordMetric).toBe('function');
    expect(typeof port.emitLog).toBe('function');
    expect(typeof port.emitSpan).toBe('function');
    expect(typeof port.registerRoute).toBe('function');
    expect(typeof port.getHealth).toBe('function');
  });

  it('registerRoute reaches the Pg query function', async () => {
    const query = vi.fn(async (_text: string, _params: unknown[]) => ({ rows: [] as any[] }));
    bootstrapDNOCPlatformPort({ query });
    getDNOCPort().registerRoute({
      moduleCode: 'dauth',
      serviceCode: 'auth-service',
      method: 'POST',
      path: '/api/auth/login',
      authRequired: false,
    });
    // registerRoute is sync-fire-and-forget: wait a microtask for the promise to resolve
    await new Promise((r) => setTimeout(r, 10));
    expect(query).toHaveBeenCalled();
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO platform_dnoc\.routes/);
  });

  it('emitLog is non-blocking and routes to the Pg query function', async () => {
    const query = vi.fn(async (_text: string, _params: unknown[]) => ({ rows: [] as any[] }));
    bootstrapDNOCPlatformPort({ query });
    getDNOCPort().emitLog({ level: 'warn', message: 'slow', moduleCode: 'dauth' });
    await new Promise((r) => setTimeout(r, 10));
    expect(query).toHaveBeenCalled();
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO platform_dnoc\.logs/);
  });

  it('getHealth queries the latest health row', async () => {
    const query = vi.fn(async (_text: string, _params: unknown[]) => ({ rows: [{ status: 'degraded' }] as any[] }));
    bootstrapDNOCPlatformPort({ query });
    const status = await getDNOCPort().getHealth('auth-service');
    expect(status).toBe('degraded');
    const [sql] = query.mock.calls[0];
    expect(sql).toMatch(/SELECT status FROM platform_dnoc\.health_checks/);
  });
});
