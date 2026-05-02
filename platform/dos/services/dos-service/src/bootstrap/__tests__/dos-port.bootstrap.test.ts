import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { bootstrapDOSPlatformPort } from '../dos-port.bootstrap';
import { getDOSPort, resetDOSPort } from '@dos/dos-core';

beforeEach(() => resetDOSPort());
afterEach(() => resetDOSPort());

describe('bootstrapDOSPlatformPort', () => {
  it('binds the DOSPort singleton with all six methods', () => {
    expect(() => getDOSPort()).toThrow(/has not been instantiated/);
    const query = vi.fn(async () => ({ rows: [] as any[] }));
    const backbonePublisher = { publish: vi.fn(async () => {}) };
    const backboneSubscriber = { subscribe: vi.fn() };
    bootstrapDOSPlatformPort({ query, backbonePublisher, backboneSubscriber });
    const port = getDOSPort();
    expect(typeof port.getTenant).toBe('function');
    expect(typeof port.publishEvent).toBe('function');
    expect(typeof port.subscribeEvent).toBe('function');
    expect(typeof port.registerModule).toBe('function');
    expect(typeof port.isModuleRegistered).toBe('function');
    expect(typeof port.listProducts).toBe('function');
  });

  it('publishEvent reaches BOTH the Pg log AND the backbone', async () => {
    const inserts: Array<{ sql: string; params: unknown[] }> = [];
    const query = vi.fn(async (sql: string, params: unknown[]) => {
      inserts.push({ sql, params });
      return { rows: [] as any[] };
    });
    const backbonePublisher = { publish: vi.fn(async () => {}) };
    const backboneSubscriber = { subscribe: vi.fn() };
    bootstrapDOSPlatformPort({ query, backbonePublisher, backboneSubscriber });

    await getDOSPort().publishEvent({
      eventType: 'dos.module.registered',
      tenantId: 't-1',
      occurredAt: '2026-04-23T00:00:00Z',
      payload: { moduleCode: 'dauth' },
    });

    // Durable log INSERT.
    expect(inserts.some((i) => /INSERT INTO platform_dos\.platform_events_log/.test(i.sql))).toBe(true);
    // Backbone publish.
    expect(backbonePublisher.publish).toHaveBeenCalledOnce();
  });

  it('getTenant round-trips via the Pg query function', async () => {
    const query = vi.fn(async (sql: string) => {
      if (/FROM platform_dos\.tenants_registry/.test(sql)) {
        return { rows: [{ tenant_id: 't-1', product_code: 'shahin-ai', status: 'active' }] };
      }
      return { rows: [] as any[] };
    });
    const backbonePublisher = { publish: vi.fn(async () => {}) };
    const backboneSubscriber = { subscribe: vi.fn() };
    bootstrapDOSPlatformPort({ query, backbonePublisher, backboneSubscriber });

    const tenant = await getDOSPort().getTenant('t-1');
    expect(tenant).toEqual({ tenantId: 't-1', productCode: 'shahin-ai', status: 'active' });
  });
});
