import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { bootstrapDSOCPlatformPort } from '../dsoc-port.bootstrap';
import { getDSOCPort, resetDSOCPort } from '@dos/dsoc-core';

beforeEach(() => resetDSOCPort());
afterEach(() => resetDSOCPort());

describe('bootstrapDSOCPlatformPort', () => {
  it('binds the DSOCPort singleton + registers all 15 backbone subscribers', () => {
    const handlers = new Map<string, (event: any) => Promise<void>>();
    const backbone = {
      subscribe: vi.fn((eventType: string, _id: string, handler: (e: any) => Promise<void>) => {
        handlers.set(eventType, handler);
      }),
    };

    const query = vi.fn(async () => ({ rows: [] as any[] }));

    expect(() => getDSOCPort()).toThrow(/has not been instantiated/);
    const result = bootstrapDSOCPlatformPort({ query, backbone });

    expect(result.subscriberCount).toBe(15);
    expect(handlers.has('dsoc.audit.authn')).toBe(true);
    expect(handlers.has('dsoc.audit.threat')).toBe(true);
    expect(handlers.has('dsoc.alert.critical')).toBe(true);
    expect(typeof getDSOCPort().recordAuditEvent).toBe('function');
  });

  it('a delivered audit event reaches the Pg query function via DSOCPort', async () => {
    const handlers = new Map<string, (event: any) => Promise<void>>();
    const backbone = {
      subscribe: (eventType: string, _id: string, handler: (e: any) => Promise<void>) => {
        handlers.set(eventType, handler);
      },
    };
    const query = vi.fn<(text: string, params: unknown[]) => Promise<{ rows: any[] }>>(async () => ({ rows: [{ id: 99 }] }));
    bootstrapDSOCPlatformPort({ query, backbone });

    const handler = handlers.get('dsoc.audit.authn')!;
    await handler({
      tenantId: 't-1',
      payload: {
        category: 'authn',
        severity: 'info',
        actor: { type: 'user', id: 'u-1' },
        action: 'dauth.login.success',
        outcome: 'success',
        occurredAt: '2026-04-22T00:00:00Z',
      },
    });

    expect(query).toHaveBeenCalledOnce();
    const [sql, params] = query.mock.calls[0];
    expect(sql).toMatch(/INSERT INTO platform_dsoc\.audit_log/);
    expect(params[0]).toBe('t-1');
    expect(params[5]).toBe('dauth.login.success');
  });

  it('a delivered alert event writes to BOTH audit_log AND alerts (2 query calls)', async () => {
    const handlers = new Map<string, (event: any) => Promise<void>>();
    const backbone = {
      subscribe: (eventType: string, _id: string, handler: (e: any) => Promise<void>) => {
        handlers.set(eventType, handler);
      },
    };
    const query = vi.fn<(text: string, params: unknown[]) => Promise<{ rows: any[] }>>(async () => ({ rows: [{ id: 42 }] }));
    bootstrapDSOCPlatformPort({ query, backbone });

    await handlers.get('dsoc.alert.critical')!({
      tenantId: 't-2',
      payload: {
        category: 'threat',
        severity: 'critical',
        actor: { type: 'user', id: 'u-2' },
        action: 'session.anomaly.detected',
        outcome: 'failure',
        occurredAt: '2026-04-22T00:01:00Z',
      },
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toMatch(/INSERT INTO platform_dsoc\.audit_log/);
    expect(query.mock.calls[1][0]).toMatch(/INSERT INTO platform_dsoc\.alerts/);
  });
});
