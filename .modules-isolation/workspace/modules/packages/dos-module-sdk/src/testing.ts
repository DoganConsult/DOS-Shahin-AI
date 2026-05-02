import type { GenericRow, QueryResultLike } from '@dos/types';

export function mockQueryResult<T = GenericRow>(rows: T[], rowCount?: number): QueryResultLike<T> {
  return { rows, rowCount: rowCount ?? rows.length };
}

export function emptyQueryResult(): QueryResultLike {
  return { rows: [], rowCount: 0 };
}

export function mockTenantId(): string {
  return 'test-tenant-' + Math.random().toString(36).substring(2, 8);
}

export function mockUserId(): string {
  return 'test-user-' + Math.random().toString(36).substring(2, 8);
}

export function mockCorrelationId(): string {
  return 'test-corr-' + Math.random().toString(36).substring(2, 12);
}

export interface MockRequest {
  user?: { userId: string; tenantId: string; role: string; permissions?: string[] };
  tenantId?: string;
  tenantSchema?: string;
  correlationId?: string;
  params?: Record<string, string>;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
}

export function createMockRequest(overrides?: Partial<MockRequest>): MockRequest {
  const tenantId = overrides?.tenantId || mockTenantId();
  return {
    user: { userId: mockUserId(), tenantId, role: 'standard_user', ...overrides?.user },
    tenantId,
    tenantSchema: `tenant_${tenantId}`,
    correlationId: mockCorrelationId(),
    params: {},
    query: {},
    body: {},
    ...overrides,
  };
}
