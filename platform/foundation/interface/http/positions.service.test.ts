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

import * as svc from './positions.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('positions.service', () => {
  it('list filters by bu_id', async () => {
    spy.setQueryStub(() => ({ rows: [{ count: '0' }] }));
    await svc.listPositions(TENANT, { bu_id: 'bu1' });
    expect(spy.calls[0].sql).toMatch(/bu_id = \$/);
  });

  it('getPositionHolders scopes by tenant', async () => {
    spy.setQueryStub(() => ({ rows: [{ user_id: 'u1' }] }));
    const r = await svc.getPositionHolders(TENANT, 'p1');
    expect(r).toHaveLength(1);
    expect(spy.calls[0].params).toEqual(['p1', TENANT]);
  });

  it('create inserts with actor', async () => {
    spy.setQueryStub(() => ({ rows: [{ position_id: 'p1' }] }));
    await svc.createPosition(TENANT, { title_en: 'CTO' }, 'u1');
    expect(spy.calls[0].params).toContain('u1');
  });

  it('update null when not found', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.updatePosition(TENANT, 'ghost', {})).toBeNull();
  });

  it('delete false when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.deletePosition(TENANT, 'ghost')).toBe(false);
  });

  it('getPosition returns null for missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getPosition(TENANT, 'ghost')).toBeNull();
  });
});
