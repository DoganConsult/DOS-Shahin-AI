import { describe, expect, it, vi } from 'vitest';
import {
  createDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
} from '..';
import type { PlatformEventEnvelope } from '@dos/ports/dos';

function build() {
  const tenants = new InMemoryTenantsRepository();
  const modules = new InMemoryModulesRepository();
  const products = new InMemoryProductsRepository();
  const events = new InMemoryEventsLogRepository();
  const busPublished: PlatformEventEnvelope[] = [];
  const busHandlers = new Map<string, (e: PlatformEventEnvelope) => Promise<void>>();
  const backbonePublisher = { publish: async (e: PlatformEventEnvelope) => { busPublished.push(e); } };
  const backboneSubscriber = {
    subscribe(eventType: string, _id: string, handler: (e: PlatformEventEnvelope) => Promise<void>) {
      busHandlers.set(eventType, handler);
    },
  };
  const port = createDOSPort({ tenants, modules, products, events, backbonePublisher, backboneSubscriber });
  return { port, tenants, modules, products, events, busPublished, busHandlers };
}

describe('createDOSPort', () => {
  it('getTenant returns null for unknown and the record for known', async () => {
    const { port, tenants } = build();
    expect(await port.getTenant('t-miss')).toBeNull();
    await tenants.upsert({ tenantId: 't-1', productCode: 'shahin-ai', status: 'active' });
    expect(await port.getTenant('t-1')).toEqual({
      tenantId: 't-1', productCode: 'shahin-ai', status: 'active',
    });
  });

  it('publishEvent writes to the durable log AND the backbone (durability first)', async () => {
    const { port, events, busPublished } = build();
    const event: PlatformEventEnvelope = {
      eventType: 'dos.tenant.registered',
      tenantId: 't-1',
      occurredAt: '2026-04-23T00:00:00Z',
      payload: { productCode: 'shahin-ai' },
    };
    await port.publishEvent(event);
    // Durable log
    const recent = await events.recent('t-1', 10);
    expect(recent).toHaveLength(1);
    expect(recent[0].eventType).toBe('dos.tenant.registered');
    // Backbone
    expect(busPublished).toHaveLength(1);
  });

  it('publishEvent log-first ordering: even if the backbone throws, the log row persists', async () => {
    const tenants = new InMemoryTenantsRepository();
    const modules = new InMemoryModulesRepository();
    const products = new InMemoryProductsRepository();
    const events = new InMemoryEventsLogRepository();
    const backbonePublisher = {
      publish: vi.fn(async () => { throw new Error('backbone down'); }),
    };
    const backboneSubscriber = { subscribe: () => {} };
    const port = createDOSPort({ tenants, modules, products, events, backbonePublisher, backboneSubscriber });

    const event: PlatformEventEnvelope = {
      eventType: 'dos.module.registered', tenantId: 't-2',
      occurredAt: '2026-04-23T00:00:00Z', payload: {},
    };
    await expect(port.publishEvent(event)).rejects.toThrow('backbone down');
    // Log row is still there.
    expect(await events.recent('t-2', 10)).toHaveLength(1);
  });

  it('subscribeEvent delegates to the backbone subscriber', async () => {
    const { port, busHandlers } = build();
    const handler = vi.fn(async () => {});
    port.subscribeEvent('dos.product.enabled', 'dos:enable-watcher', handler);
    expect(busHandlers.has('dos.product.enabled')).toBe(true);
    await busHandlers.get('dos.product.enabled')!({
      eventType: 'dos.product.enabled', tenantId: 't', occurredAt: 'now', payload: {},
    });
    expect(handler).toHaveBeenCalledOnce();
  });

  it('registerModule fire-and-forget; modules repo receives the descriptor', async () => {
    const { port, modules } = build();
    port.registerModule({ moduleCode: 'dauth', version: '1.0.0', layer: 'platform', ownerTeam: 'platform-core' });
    // Fire-and-forget resolves on next microtask.
    await new Promise((r) => setTimeout(r, 0));
    expect(await modules.isRegistered('dauth')).toBe(true);
  });

  it('isModuleRegistered returns true (port-level contract; observability only)', () => {
    const { port } = build();
    expect(port.isModuleRegistered('dauth')).toBe(true);
  });

  it('listProducts returns every registered product', async () => {
    const { port, products } = build();
    await products.register({ productCode: 'shahin-ai', version: '1.0.0', enabled: true });
    await products.register({ productCode: 'tajiir', version: '0.1.0', enabled: false });
    const list = await port.listProducts();
    expect(list).toHaveLength(2);
  });

  it('exposes exactly the six DOSPort methods', () => {
    const { port } = build();
    expect(Object.keys(port).sort()).toEqual([
      'getTenant',
      'isModuleRegistered',
      'listProducts',
      'publishEvent',
      'registerModule',
      'subscribeEvent',
    ]);
  });
});
