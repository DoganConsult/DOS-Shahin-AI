import { describe, expect, it, vi, beforeEach } from 'vitest';

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
  return {
    spy: {
      calls,
      setQueryStub: (next: typeof stub) => { stub = next; },
      withTenantClient,
    },
  };
});

vi.mock('@dos/db', () => ({
  withTenantClient: spy.withTenantClient,
  query: vi.fn(),
  toErrorMessage: (e: unknown) => (e as Error)?.message ?? String(e),
}));

vi.mock('../observability/metrics', () => ({
  userMetrics: { viewPrefUpsert: vi.fn(), observeDb: vi.fn() },
}));

import * as viewPref from './view-preference.service';
import { UserServiceError, buildUserError, throwUserError } from './contracts/user-errors';

const TENANT = 'tenant-a';
const USER = '11111111-2222-3333-4444-555555555555';

beforeEach(() => {
  spy.calls.length = 0;
  spy.setQueryStub(() => ({ rows: [] }));
});

describe('view-preference.service', () => {
  describe('assertModuleView', () => {
    it('accepts valid keys', () => {
      expect(() => viewPref.assertModuleView('risk', 'my_view')).not.toThrow();
      expect(() => viewPref.assertModuleView('a', 'b')).not.toThrow();
    });

    it.each([
      ['', 'view'],
      ['Bad', 'ok'],           // uppercase
      ['risk!', 'ok'],         // symbol
      [Array(70).join('a'), 'ok'], // too long
      ['risk', ''],
    ])('rejects invalid keys module=%p view=%p', (module, view) => {
      expect(() => viewPref.assertModuleView(module, view))
        .toThrowError(expect.objectContaining({ code: 'VIEW_PREF_INVALID_KEY' }));
    });
  });

  describe('upsert', () => {
    it('inserts with tenant scoping', async () => {
      spy.setQueryStub(() => ({ rows: [{ module_code: 'risk', view_key: 'v', config: {}, is_shared: false, updated_at: 'now' }] }));
      const row = await viewPref.upsert(TENANT, USER, 'risk', 'v', { config: { a: 1 } });
      expect(row.module_code).toBe('risk');
      expect(spy.calls[0].tenantId).toBe(TENANT);
      expect(spy.calls[0].params).toContain(TENANT);
    });

    it('rejects oversized config', async () => {
      const big = 'x'.repeat(65 * 1024);
      await expect(
        viewPref.upsert(TENANT, USER, 'risk', 'v', { config: { blob: big } }),
      ).rejects.toMatchObject({ code: 'VIEW_PREF_CONFIG_TOO_LARGE', status: 413 });
    });

    it('blocks is_shared=true without share authority', async () => {
      await expect(
        viewPref.upsert(TENANT, USER, 'risk', 'v', { config: {}, isShared: true }, { canShare: false }),
      ).rejects.toMatchObject({ code: 'VIEW_PREF_SHARE_FORBIDDEN', status: 403 });
    });

    it('allows is_shared=true when canShare', async () => {
      spy.setQueryStub(() => ({ rows: [{ module_code: 'risk', view_key: 'v', config: {}, is_shared: true, updated_at: 'now' }] }));
      const row = await viewPref.upsert(TENANT, USER, 'risk', 'v', { config: {}, isShared: true }, { canShare: true });
      expect(row.is_shared).toBe(true);
    });

    it('rejects invalid module key via upsert path', async () => {
      await expect(viewPref.upsert(TENANT, USER, 'BadModule', 'v', { config: {} }))
        .rejects.toMatchObject({ code: 'VIEW_PREF_INVALID_KEY' });
    });
  });

  describe('getOne / listForUser / listShared / remove', () => {
    it('getOne returns null when not found', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      expect(await viewPref.getOne(TENANT, USER, 'risk', 'v')).toBeNull();
    });

    it('listForUser filters by module if provided', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      await viewPref.listForUser(TENANT, USER, 'risk');
      expect(spy.calls[0].sql).toContain('AND module_code = $3');
      expect(spy.calls[0].params).toEqual([USER, TENANT, 'risk']);
    });

    it('listShared applies tenant scope + shared filter', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      await viewPref.listShared(TENANT);
      expect(spy.calls[0].sql).toContain('is_shared = TRUE');
      expect(spy.calls[0].params).toEqual([TENANT]);
    });

    it('remove returns affected row count', async () => {
      spy.setQueryStub(() => ({ rows: [{}], rowCount: 1 }));
      const n = await viewPref.remove(TENANT, USER, 'risk', 'v');
      expect(n).toBe(1);
    });
  });

  it('UserServiceError surface shape is RFC-7807-compatible', () => {
    const e = new UserServiceError('VIEW_PREF_INVALID_KEY', 'corr-1', { moduleCode: 'x' });
    const body = e.toJSON();
    expect(body.code).toBe('VIEW_PREF_INVALID_KEY');
    expect(body.status).toBe(400);
    expect(body.correlationId).toBe('corr-1');
    expect(body.detail).toEqual({ moduleCode: 'x' });
  });

  describe('listForUser', () => {
    it('lists without moduleFilter → simple WHERE', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      await viewPref.listForUser(TENANT, USER);
      expect(spy.calls[0].sql).not.toContain('AND module_code');
      expect(spy.calls[0].params).toEqual([USER, TENANT]);
    });
  });

  describe('listShared', () => {
    it('applies module filter when provided', async () => {
      spy.setQueryStub(() => ({ rows: [] }));
      await viewPref.listShared(TENANT, 'risk');
      expect(spy.calls[0].sql).toContain('AND module_code = $2');
      expect(spy.calls[0].params).toEqual([TENANT, 'risk']);
    });
  });

  describe('upsert — null config', () => {
    it('defaults empty object when config undefined', async () => {
      spy.setQueryStub(() => ({ rows: [{ module_code: 'risk', view_key: 'v', config: {}, is_shared: false, updated_at: 'now' }] }));
      await viewPref.upsert(TENANT, USER, 'risk', 'v', { config: undefined as any });
      // serialized JSON should be '{}' in the params
      expect(spy.calls[0].params[4]).toBe('{}');
    });
  });

  describe('remove', () => {
    it('validates module/view before touching DB', async () => {
      await expect(viewPref.remove(TENANT, USER, 'Bad', 'v')).rejects.toMatchObject({ code: 'VIEW_PREF_INVALID_KEY' });
    });

    it('returns 0 when nothing deleted', async () => {
      spy.setQueryStub(() => ({ rows: [], rowCount: 0 }));
      expect(await viewPref.remove(TENANT, USER, 'risk', 'v')).toBe(0);
    });
  });

  describe('getOne', () => {
    it('validates key first (never touches DB on bad key)', async () => {
      await expect(viewPref.getOne(TENANT, USER, 'Bad', 'v')).rejects.toMatchObject({ code: 'VIEW_PREF_INVALID_KEY' });
      expect(spy.calls).toHaveLength(0);
    });
  });

  describe('user-errors helpers', () => {
    it('buildUserError returns a canonical body', () => {
      const body = buildUserError('USER_NOT_FOUND', 'corr-2', { userId: 'u1' });
      expect(body.code).toBe('USER_NOT_FOUND');
      expect(body.status).toBe(404);
      expect(body.correlationId).toBe('corr-2');
      expect(body.detail).toEqual({ userId: 'u1' });
    });

    it('buildUserError generates a correlationId when omitted', () => {
      const body = buildUserError('USER_NOT_FOUND');
      expect(body.correlationId).toMatch(/[0-9a-f-]{36}/);
    });

    it('buildUserError omits detail when not provided', () => {
      const body = buildUserError('USER_NOT_FOUND', 'c');
      expect('detail' in body).toBe(false);
    });

    it('throwUserError throws a UserServiceError', () => {
      expect(() => throwUserError('USER_NOT_FOUND', 'c', { x: 1 })).toThrow(UserServiceError);
    });
  });
});
