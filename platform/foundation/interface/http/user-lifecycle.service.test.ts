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

import * as svc from './user-lifecycle.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('user-lifecycle.service', () => {
  it('onboard marks flags', async () => {
    spy.setQueryStub(() => ({ rows: [{ user_id: 'u1', email: 'x', display_name: null, onboarding_complete: true, member_onboarded: true }] }));
    const r = await svc.onboard(TENANT, 'u1');
    expect(r?.onboarding_complete).toBe(true);
  });

  it('onboard null when missing', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.onboard(TENANT, 'ghost')).toBeNull();
  });

  it('offboard cascades into role + committee cleanups', async () => {
    let step = 0;
    spy.setQueryStub(() => {
      step += 1;
      if (step === 1) return { rows: [{ user_id: 'u1', email: 'x', display_name: null, status: 'offboarded' }] };
      return { rows: [] };
    });
    const r = await svc.offboard(TENANT, 'u1');
    expect(r?.status).toBe('offboarded');
    expect(spy.calls.length).toBe(3);
    expect(spy.calls[1].sql).toMatch(/dos\.role_assignments/);
    expect(spy.calls[2].sql).toMatch(/dos\.committee_members/);
  });

  it('offboard null when user not found (skips cleanup)', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.offboard(TENANT, 'ghost')).toBeNull();
    expect(spy.calls.length).toBe(1);
  });

  it('suspend only succeeds on active users', async () => {
    spy.setQueryStub(() => ({ rows: [{ user_id: 'u1', email: 'x', display_name: null, status: 'suspended' }] }));
    const r = await svc.suspend(TENANT, 'u1');
    expect(r?.status).toBe('suspended');
    expect(spy.calls[0].sql).toMatch(/status = 'active'/);
  });

  it('reactivate only matches on suspended/inactive/offboarded', async () => {
    spy.setQueryStub(() => ({ rows: [{ user_id: 'u1', email: 'x', display_name: null, status: 'active' }] }));
    await svc.reactivate(TENANT, 'u1');
    expect(spy.calls[0].sql).toMatch(/IN \('suspended','inactive','offboarded'\)/);
  });

  it('reactivate null when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.reactivate(TENANT, 'ghost')).toBeNull();
  });

  it('suspend null when nothing matched', async () => {
    spy.setQueryStub(() => ({ rows: [] }));
    expect(await svc.suspend(TENANT, 'ghost')).toBeNull();
  });
});
