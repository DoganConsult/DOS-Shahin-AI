/**
 * @dos/module-sdk pagination utilities
 * Pagination helpers for list endpoints and database queries
 */
import type { PaginationParams, PaginatedResult, PaginatedMeta } from '@dos/types';
export declare const DEFAULT_PAGE = 1;
export declare const DEFAULT_PAGE_SIZE = 20;
export declare const MAX_PAGE_SIZE = 200;
export declare const MIN_PAGE_SIZE = 1;
export declare function parsePaginationParams(query: Record<string, unknown>): PaginationParams;
export declare function parsePageNumber(value: unknown): number;
export declare function parsePageSize(value: unknown): number;
export declare function parseSortBy(value: unknown): string | undefined;
export declare function parseSortOrder(value: unknown): 'asc' | 'desc';
export declare function calculateOffset(page: number, pageSize: number): number;
export declare function calculateTotalPages(total: number, pageSize: number): number;
export declare function buildPaginatedMeta(total: number, page: number, pageSize: number, requestId?: string): PaginatedMeta;
export interface ExtendedPaginatedMeta extends PaginatedMeta {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    firstPage: number;
    lastPage: number;
}
export declare function buildExtendedPaginatedMeta(total: number, page: number, pageSize: number, requestId?: string): ExtendedPaginatedMeta;
export declare function buildPaginatedResult<T>(data: T[], total: number, page: number, pageSize: number): PaginatedResult<T>;
export declare function emptyPaginatedResult<T>(page?: number, pageSize?: number): PaginatedResult<T>;
/**
 * Paginate an in-memory array
 */
export declare function paginateArray<T>(items: T[], page: number, pageSize: number): PaginatedResult<T>;
/**
 * Paginate and sort an in-memory array
 */
export declare function paginateAndSortArray<T>(items: T[], params: PaginationParams, sortFn?: (a: T, b: T) => number): PaginatedResult<T>;
export interface SQLPaginationClause {
    limitClause: string;
    offsetClause: string;
    combined: string;
    params: {
        limit: number;
        offset: number;
    };
}
export declare function buildSQLPagination(params: PaginationParams): SQLPaginationClause;
export interface SQLOrderByClause {
    clause: string;
    column: string;
    direction: 'ASC' | 'DESC';
}
export declare function buildSQLOrderBy(params: PaginationParams, allowedColumns?: Set<string>, defaultColumn?: string): SQLOrderByClause;
export interface CursorPaginationParams {
    cursor?: string;
    limit: number;
    direction: 'forward' | 'backward';
}
export interface CursorPaginatedResult<T> {
    data: T[];
    nextCursor: string | null;
    prevCursor: string | null;
    hasMore: boolean;
}
export declare function parseCursorParams(query: Record<string, unknown>): CursorPaginationParams;
export declare function encodeCursor(id: string, timestamp?: Date): string;
export declare function decodeCursor(cursor: string): {
    id: string;
    timestamp: string;
} | null;
export declare function buildCursorPaginatedResult<T extends {
    id: string;
}>(data: T[], limit: number, getTimestamp?: (item: T) => Date): CursorPaginatedResult<T>;
export type { PaginationParams, PaginatedResult, PaginatedMeta } from '@dos/types';
