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

import * as svc from './committees.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('committees.service', () => {
  it('list applies status filter', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listCommittees(TENANT, 'active');
    expect(spy.calls[0].sql).toMatch(/status = \$/);
  });

  it('list without status', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listCommittees(TENANT);
    expect(spy.calls[0].sql).not.toMatch(/status = \$/);
  });

  it('listMembers joins users + filters soft-delete on both', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    await svc.listMembers(TENANT, 'c1');
    expect(spy.calls[0].sql).toMatch(/u\.deleted_at IS NULL/);
  });

  it('create defaults committee_type to standing', async () => {
    spy.setQueryStub(() => ({ rows: [{ committee_id: 'c1' }] }));
    await svc.createCommittee(TENANT, { name_en: 'Audit' }, 'u1');
    expect(spy.calls[0].params[5]).toBe('standing');
  });

  it('addMember defaults role to member', async () => {
    spy.setQueryStub(() => ({ rows: [{ member_id: 'm1' }] }));
    await svc.addMember(TENANT, 'c1', 'u2');
    expect(spy.calls[0].params[4]).toBe('member');
  });

  it('removeMember false when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.removeMember(TENANT, 'c1', 'ghost')).toBe(false);
  });

  it('get returns null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.getCommittee(TENANT, 'ghost')).toBeNull();
  });
});
