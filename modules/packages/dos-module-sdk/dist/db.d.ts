import type { QueryResultLike, GenericRow } from '@dos/types';
export declare function getFirstRow<T = GenericRow>(result: QueryResultLike<T>): T | null;
export declare function getFirstRowOrThrow<T = GenericRow>(result: QueryResultLike<T>, errorMsg?: string): T;
export declare function assertHasRows<T>(result: QueryResultLike<T>, errorMsg?: string): asserts result is QueryResultLike<T> & {
    rows: [T, ...T[]];
};
export declare function rowCount(result: QueryResultLike): number;
export declare function assertTenantId(tenantId: string | undefined | null): asserts tenantId is string;
export declare function tenantSchema(tenantId: string): string;
export declare function safeRows(sql: string, params?: unknown[]): Promise<GenericRow[]>;
export type { QueryResultLike, GenericRow };
