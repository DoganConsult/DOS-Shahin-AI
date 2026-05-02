import { describe, it, expect, vi, beforeEach } from 'vitest';

const { spy } = vi.hoisted(() => {
  const calls: Array<{ tenantId: string; sql: string; params: unknown[] }> = [];
  let stub: (sql: string, params?: unknown[]) => any = () => ({ rows: [], rowCount: 0 });
  let nextFail = false;
  const withTenantClient = async (tenantId: string, fn: (c: any) => any) => {
    if (nextFail) { nextFail = false; throw new Error('db down'); }
    const client = {
      query: async (sql: string, params?: unknown[]) => {
        calls.push({ tenantId, sql, params: params ?? [] });
        return stub(sql, params);
      },
    };
    return fn(client);
  };
  return {
    spy: {
      calls,
      setQueryStub: (next: typeof stub) => { stub = next; },
      forceNextFailure: () => { nextFail = true; },
      withTenantClient,
    },
  };
});

const { subscribers, mockLoggerError } = vi.hoisted(() => ({
  subscribers: {} as Record<string, (event: any) => Promise<void>>,
  mockLoggerError: vi.fn(),
}));

vi.mock('@dos/db', () => ({
  withTenantClient: spy.withTenantClient,
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('@dos/module-sdk', () => ({
  subscribeEvent: (eventType: string, _svc: string, handler: (event: any) => Promise<void>) => {
    subscribers[eventType] = handler;
  },
  logger: { info: vi.fn(), warn: vi.fn(), error: mockLoggerError, debug: vi.fn() },
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: { observeDb: vi.fn() },
}));

import { startConsumer } from './consumer';

beforeEach(async () => {
  spy.calls.length = 0;
  mockLoggerError.mockClear();
  for (const k of Object.keys(subscribers)) delete subscribers[k];
  await startConsumer();
});

describe('event consumer', () => {
  it('subscribes to the 5 expected event types', () => {
    expect(Object.keys(subscribers).sort()).toEqual([
      'auth.login_success',
      'auth.user_suspended',
      'foundation.dept_updated',
      'tenant.deleted',
      'tenant.user_provisioned',
    ]);
  });

  it('auth.login_success no-ops when tenantId or userId missing', async () => {
    await subscribers['auth.login_success']({ tenantId: 't1' });
    expect(spy.calls).toHaveLength(0);
    await subscribers['auth.login_success']({ userId: 'u1' });
    expect(spy.calls).toHaveLength(0);
  });

  it('auth.login_success updates dos.users when both IDs present', async () => {
    await subscribers['auth.login_success']({ tenantId: 't1', userId: 'u1' });
    expect(spy.calls.length).toBeGreaterThanOrEqual(1);
    expect(spy.calls[0].sql).toMatch(/UPDATE dos.users/);
    expect(spy.calls[0].params).toEqual(['u1', 't1']);
  });

  it('tenant.user_provisioned updates role when provided', async () => {
    await subscribers['tenant.user_provisioned']({
      tenantId: 't1',
      entityId: 'u1',
      data: { platformRole: 'admin' },
    });
    expect(spy.calls[0].sql).toMatch(/SET role = \$2/);
    expect(spy.calls[0].params).toEqual(['u1', 'admin', 't1']);
  });

  it('tenant.user_provisioned ignores events without role', async () => {
    await subscribers['tenant.user_provisioned']({ tenantId: 't1', entityId: 'u1', data: {} });
    expect(spy.calls).toHaveLength(0);
  });

  it('foundation.dept_updated touches users in that dept', async () => {
    await subscribers['foundation.dept_updated']({ tenantId: 't1', entityId: 'd1' });
    expect(spy.calls[0].params).toEqual(['d1', 't1']);
    expect(spy.calls[0].sql).toMatch(/department_id = \$1/);
  });

  it('tenant.deleted soft-deletes teams, departments, and role assignments', async () => {
    await subscribers['tenant.deleted']({ tenantId: 't1' });
    expect(spy.calls).toHaveLength(3);
    const sqls = spy.calls.map((c) => c.sql);
    expect(sqls.some((s) => /dos\.teams/.test(s))).toBe(true);
    expect(sqls.some((s) => /dos\.departments/.test(s))).toBe(true);
    expect(sqls.some((s) => /dos\.user_role_assignments/.test(s))).toBe(true);
  });

  it('auth.user_suspended updates public.users.status', async () => {
    await subscribers['auth.user_suspended']({ tenantId: 't1', entityId: 'u1' });
    expect(spy.calls[0].sql).toMatch(/UPDATE public.users/);
    expect(spy.calls[0].sql).toMatch(/status = 'suspended'/);
  });

  it('safeHandler logs handler failure and does NOT re-throw', async () => {
    spy.forceNextFailure();
    await subscribers['auth.login_success']({ tenantId: 't1', userId: 'u1' });
    expect(mockLoggerError).toHaveBeenCalledWith(
      '[user-service.consumer] Handler failed',
      expect.objectContaining({ event: 'auth.login_success', error: 'db down' }),
    );
  });
});
