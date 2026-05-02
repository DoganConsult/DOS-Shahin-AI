import type { GenericRow, QueryResultLike } from '@dos/types';
export declare function mockQueryResult<T = GenericRow>(rows: T[], rowCount?: number): QueryResultLike<T>;
export declare function emptyQueryResult(): QueryResultLike;
export declare function mockTenantId(): string;
export declare function mockUserId(): string;
export declare function mockCorrelationId(): string;
export interface MockRequest {
    user?: {
        userId: string;
        tenantId: string;
        role: string;
        permissions?: string[];
    };
    tenantId?: string;
    tenantSchema?: string;
    correlationId?: string;
    params?: Record<string, string>;
    query?: Record<string, string>;
    body?: Record<string, unknown>;
}
export declare function createMockRequest(overrides?: Partial<MockRequest>): MockRequest;
