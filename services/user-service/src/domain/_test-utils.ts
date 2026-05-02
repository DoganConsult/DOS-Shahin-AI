/**
 * Test helpers — small factory that records tenant/sql/params on every query
 * so unit tests can assert tenant scoping without a real DB.
 *
 * NOTE: `vi.mock` must live at the top of each test file; this module only
 * provides the client/spy factories used inside the mock factory.
 */
// @dos/db re-exports these pg types; we import via the package alias
// so the service-boundary contract test (no direct pg imports in
// services/*) stays green without needing to skip this file.
import type { PoolClient, QueryResult } from '@dos/db';

export type QueryStub = (sql: string, params?: unknown[]) =>
  | Promise<Partial<QueryResult>>
  | Partial<QueryResult>;

export interface TenantClientSpy {
  calls: Array<{ tenantId: string; sql: string; params: unknown[] }>;
  lastTenantId(): string | undefined;
  setQueryStub(stub: QueryStub): void;
  withTenantClient: <T>(tenantId: string, fn: (c: PoolClient) => Promise<T>) => Promise<T>;
}

export function createTenantClientSpy(): TenantClientSpy {
  const calls: TenantClientSpy['calls'] = [];
  let stub: QueryStub = () => ({ rows: [], rowCount: 0 });

  return {
    calls,
    lastTenantId: () => calls[calls.length - 1]?.tenantId,
    setQueryStub: (next) => { stub = next; },
    withTenantClient: async (tenantId, fn) => {
      const client = {
        query: async (sql: string, params?: unknown[]) => {
          calls.push({ tenantId, sql, params: params ?? [] });
          const r = await stub(sql, params);
          return {
            rows: r.rows ?? [],
            rowCount: r.rowCount ?? (r.rows?.length ?? 0),
            command: '',
            oid: 0,
            fields: [],
          } as QueryResult;
        },
      } as unknown as PoolClient;
      return fn(client);
    },
  };
}
