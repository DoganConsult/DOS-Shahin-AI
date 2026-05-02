import { describe, it, expect, vi, beforeEach } from 'vitest';

const { spy } = vi.hoisted(() => {
  const calls: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  let stub: (sql: string, params?: unknown[]) => any = () => ({ rows: [], rowCount: 0 });
  const withTenantClient = async (tenantId: string, fn: (c: any) => any) => {
    const client = {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ tenantId, sql, params: params ?? [] });
        const r = await stub(sql, params);
        return { rows: r.rows ?? [], rowCount: r.rowCount ?? (r.rows?.length ?? 0), command: '', oid: 0, fields: [] };
      },
    };
    return fn(client);
  };
  return { spy: { calls, setQueryStub: (next: typeof stub) => { stub = next; }, withTenantClient } };
});

vi.mock('../../ports/database.port', () => ({ withTenantClient: spy.withTenantClient, tenantSchema: (t: string) => `tenant_${t}` }));
vi.mock('../../infrastructure/observability/metrics', () => ({ userMetrics: { observeDb: vi.fn() } }));

import * as svc from './locations.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('locations.service', () => {
  it('list applies all filters', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await svc.listLocations(TENANT, { location_type: 'office', country: 'SA', parent_id: 'p1', search: 'x' });
    expect(spy.calls[0].sql).toMatch(/location_type = \$/);
    expect(spy.calls[0].sql).toMatch(/country = \$/);
    expect(spy.calls[0].sql).toMatch(/parent_location_id = \$/);
    expect(spy.calls[0].params.some((p) => p === '%x%')).toBe(true);
  });

  it('listChildLocations scopes by parent + tenant', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listChildLocations(TENANT, 'p1');
    expect(spy.calls[0].params).toEqual(['p1', TENANT]);
  });

  it('listLocationBUs joins via location_bu_map', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listLocationBUs(TENANT, 'loc1');
    expect(spy.calls[0].sql).toMatch(/JOIN dos\.location_bu_map/);
  });

  it('assignBuToLocation is idempotent (ON CONFLICT DO NOTHING)', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.assignBuToLocation(TENANT, 'loc1', 'bu1');
    expect(spy.calls[0].sql).toMatch(/ON CONFLICT DO NOTHING/);
  });

  it('removeBuFromLocation deletes by 3-part key', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.removeBuFromLocation(TENANT, 'loc1', 'bu1');
    expect(spy.calls[0].params).toEqual(['loc1', 'bu1', TENANT]);
  });

  it('create defaults location_type to office', async () => {
    spy.setQueryStub(() => ({ rows: [{ location_id: 'l1' }] }));
    await svc.createLocation(TENANT, { name_en: 'HQ' }, 'u1');
    expect(spy.calls[0].params[5]).toBe('office');
  });

  it('update returns null when row missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.updateLocation(TENANT, 'ghost', {})).toBeNull();
  });

  it('delete false when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.deleteLocation(TENANT, 'ghost')).toBe(false);
  });

  it('get returns null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getLocation(TENANT, 'ghost')).toBeNull();
  });
});
