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

import { runBulkInvite, BULK_INVITE_MAX } from './bulk-invite.service';

const TENANT = 't-a';
beforeEach(() => { spy.calls.length = 0; spy.setQueryStub(() => ({ rows: [] })); });

describe('bulk-invite.service', () => {
  it('returns per-invite status', async () => {
    // 1st invite → new user; 2nd → existing; 3rd → missing email
    let step = 0;
    spy.setQueryStub((sql) => {
      step += 1;
      if (/SELECT user_id/.test(sql)) {
        if (step <= 1) return { rows: [] };          // first: not existing
        return { rows: [{ user_id: 'existing' }] };  // second: existing
      }
      return { rows: [] };
    });
    const outcome = await runBulkInvite(TENANT, [
      { email: 'alice@x.com' },
      { email: 'bob@x.com' },
      { email: '' as any },
    ]);
    expect(outcome.total).toBe(3);
    expect(outcome.invited).toBe(1);
    expect(outcome.skipped).toBe(2);
    expect(outcome.details[0].status).toBe('invited');
    expect(outcome.details[1].status).toBe('skipped');
    expect(outcome.details[2].status).toBe('skipped');
    expect(outcome.batch_id).toMatch(/[0-9a-f-]{36}/);
  });

  it('captures failure when INSERT throws', async () => {
    let step = 0;
    spy.setQueryStub((sql) => {
      step += 1;
      if (/SELECT user_id/.test(sql)) return { rows: [] };
      throw new Error('unique violation');
    });
    const outcome = await runBulkInvite(TENANT, [{ email: 'bad@x.com' }]);
    expect(outcome.failed).toBe(1);
    expect(outcome.details[0].status).toBe('failed');
    expect(outcome.details[0].error).toMatch(/unique/);
  });

  it('BULK_INVITE_MAX is 500', () => {
    expect(BULK_INVITE_MAX).toBe(500);
  });
});
