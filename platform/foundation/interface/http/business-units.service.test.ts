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

import * as svc from './business-units.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('business-units.service', () => {
  it('list applies organization_id filter', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await svc.listBusinessUnits(TENANT, { organization_id: 'o1' });
    expect(spy.calls[0].sql).toMatch(/organization_id = \$/);
  });

  it('create defaults bu_type to department', async () => {
    spy.setQueryStub(() => ({ rows: [{ bu_id: 'b1' }] }));
    await svc.createBusinessUnit(TENANT, { name_en: 'BU' }, 'u1');
    // position 8 (0-indexed 7) is bu_type — should be 'department'
    expect(spy.calls[0].params[7]).toBe('department');
  });

  it('get returns null when not found', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getBusinessUnit(TENANT, 'ghost')).toBeNull();
  });

  it('update null when not found', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.updateBusinessUnit(TENANT, 'x', {})).toBeNull();
  });

  it('delete false when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.deleteBusinessUnit(TENANT, 'ghost')).toBe(false);
  });
});
