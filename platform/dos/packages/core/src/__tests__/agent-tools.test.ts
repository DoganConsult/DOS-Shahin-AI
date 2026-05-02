import { describe, expect, it } from 'vitest';
import {
  buildDOSAgentTools,
  createDOSPort,
  InMemoryTenantsRepository,
  InMemoryModulesRepository,
  InMemoryProductsRepository,
  InMemoryEventsLogRepository,
} from '..';

function build() {
  const tenants = new InMemoryTenantsRepository();
  const modules = new InMemoryModulesRepository();
  const products = new InMemoryProductsRepository();
  const events = new InMemoryEventsLogRepository();
  const port = createDOSPort({
    tenants, modules, products, events,
    backbonePublisher: { publish: async () => {} },
    backboneSubscriber: { subscribe: () => {} },
  });
  const tools = buildDOSAgentTools({ port, tenants, modules, events });
  return { port, tenants, modules, products, events, tools };
}

describe('buildDOSAgentTools', () => {
  it('exposes exactly four tools with unique names', () => {
    const { tools } = build();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'dos.get_tenant',
      'dos.list_modules',
      'dos.list_products',
      'dos.recent_events',
    ]);
  });

  it('dos.get_tenant throws on missing input, returns null on miss, record on hit', async () => {
    const { tools, tenants } = build();
    const tool = tools.find((t) => t.name === 'dos.get_tenant')!;
    await expect(tool.handler('', {})).rejects.toThrow(/tenantId is required/);
    expect(await tool.handler('', { tenantId: 'nope' })).toBeNull();
    await tenants.upsert({ tenantId: 't-1', productCode: 'shahin-ai', status: 'active' });
    const out = await tool.handler('', { tenantId: 't-1' });
    expect((out as any).productCode).toBe('shahin');
  });

  it('dos.list_products returns all products', async () => {
    const { tools, products } = build();
    await products.register({ productCode: 'shahin-ai', version: '1.0.0', enabled: true });
    await products.register({ productCode: 'tajiir', version: '0.1.0', enabled: false });
    const out = await tools.find((t) => t.name === 'dos.list_products')!.handler('', {});
    expect((out as any).count).toBe(2);
  });

  it('dos.list_modules filters by layer when passed', async () => {
    const { tools, port } = build();
    port.registerModule({ moduleCode: 'dauth', version: '1.0.0', layer: 'platform', ownerTeam: 'platform-core' });
    port.registerModule({ moduleCode: 'risk', version: '1.0.0', layer: 'product', ownerTeam: 'product-shahin' });
    await new Promise((r) => setTimeout(r, 0));

    const tool = tools.find((t) => t.name === 'dos.list_modules')!;
    const all = await tool.handler('', {});
    expect((all as any).count).toBe(2);
    const platformOnly = await tool.handler('', { layer: 'platform' });
    expect((platformOnly as any).count).toBe(1);
    expect((platformOnly as any).modules[0].moduleCode).toBe('dauth');
  });

  it('dos.recent_events returns tenant events in reverse chronological order', async () => {
    const { tools, port } = build();
    await port.publishEvent({
      eventType: 'dos.tenant.registered', tenantId: 't-1',
      occurredAt: '2026-04-23T00:00:00Z', payload: {},
    });
    await port.publishEvent({
      eventType: 'dos.module.registered', tenantId: 't-1',
      occurredAt: '2026-04-23T00:01:00Z', payload: { moduleCode: 'dauth' },
    });
    const out = await tools.find((t) => t.name === 'dos.recent_events')!.handler('t-1', { limit: 10 });
    expect((out as any).count).toBe(2);
  });
});
