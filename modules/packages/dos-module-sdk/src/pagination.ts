/**
 * @dos/module-sdk pagination utilities
 * Pagination helpers for list endpoints and database queries
 */

import type { PaginationParams, PaginatedResult, PaginatedMeta } from '@dos/types';

// ────────────────────────────────────────────────────────────────────────────
// Constants
// ────────────────────────────────────────────────────────────────────────────

export const DEFAULT_PAGE = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 200;
export const MIN_PAGE_SIZE = 1;

// ────────────────────────────────────────────────────────────────────────────
// Pagination Parameter Parsing
// ────────────────────────────────────────────────────────────────────────────

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  const page = parsePageNumber(query.page);
  const pageSize = parsePageSize(query.pageSize ?? query.limit ?? query.perPage);
  const sortBy = parseSortBy(query.sortBy ?? query.orderBy);
  const sortOrder = parseSortOrder(query.sortOrder ?? query.order);

  return {
    page,
    limit: pageSize,
    pageSize,
    sortBy,
    sortOrder,
  };
}

export function parsePageNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    if (!Number.isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_PAGE;
}

export function parsePageSize(value: unknown): number {
  let size: number;

  if (typeof value === 'number' && Number.isInteger(value)) {
    size = value;
  } else if (typeof value === 'string') {
    size = parseInt(value, 10);
    if (Number.isNaN(size)) {
      return DEFAULT_PAGE_SIZE;
    }
  } else {
    return DEFAULT_PAGE_SIZE;
  }

  // Clamp to valid range
  return Math.max(MIN_PAGE_SIZE, Math.min(MAX_PAGE_SIZE, size));
}

export function parseSortBy(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim().length > 0) {
    // Sanitize to prevent SQL injection
    const sanitized = value.replace(/[^a-zA-Z0-9_.-]/g, '');
    return sanitized.length > 0 ? sanitized : undefined;
  }
  return undefined;
}

export function parseSortOrder(value: unknown): 'asc' | 'desc' {
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'desc' || lower === 'descending' || lower === '-1') {
      return 'desc';
    }
  }
  return 'asc';
}

// ────────────────────────────────────────────────────────────────────────────
// Offset Calculation
// ────────────────────────────────────────────────────────────────────────────

export function calculateOffset(page: number, pageSize: number): number {
  return (Math.max(1, page) - 1) * pageSize;
}

export function calculateTotalPages(total: number, pageSize: number): number {
  if (total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

// ────────────────────────────────────────────────────────────────────────────
// Pagination Metadata
// ────────────────────────────────────────────────────────────────────────────

export function buildPaginatedMeta(
  total: number,
  page: number,
  pageSize: number,
  requestId?: string
): PaginatedMeta {
  return {
    requestId: requestId || '',
    timestamp: new Date().toISOString(),
    page,
    pageSize,
    total,
    totalPages: calculateTotalPages(total, pageSize),
  };
}

export interface ExtendedPaginatedMeta extends PaginatedMeta {
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  firstPage: number;
  lastPage: number;
}

export function buildExtendedPaginatedMeta(
  total: number,
  page: number,
  pageSize: number,
  requestId?: string
): ExtendedPaginatedMeta {
  const base = buildPaginatedMeta(total, page, pageSize, requestId);
  return {
    ...base,
    hasNextPage: page < base.totalPages,
    hasPreviousPage: page > 1,
    firstPage: 1,
    lastPage: Math.max(1, base.totalPages),
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Paginated Result Builders
// ────────────────────────────────────────────────────────────────────────────

export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  page: number,
  pageSize: number
): PaginatedResult<T> {
  return {
    data,
    total,
    page,
    limit: pageSize,
    pageSize,
    totalPages: calculateTotalPages(total, pageSize),
  };
}

export function emptyPaginatedResult<T>(
  page: number = DEFAULT_PAGE,
  pageSize: number = DEFAULT_PAGE_SIZE
): PaginatedResult<T> {
  return buildPaginatedResult<T>([], 0, page, pageSize);
}

// ────────────────────────────────────────────────────────────────────────────
// In-Memory Pagination
// ────────────────────────────────────────────────────────────────────────────

/**
 * Paginate an in-memory array
 */
export function paginateArray<T>(
  items: T[],
  page: number,
  pageSize: number
): PaginatedResult<T> {
  const total = items.length;
  const offset = calculateOffset(page, pageSize);
  const data = items.slice(offset, offset + pageSize);

  return buildPaginatedResult(data, total, page, pageSize);
}

/**
 * Paginate and sort an in-memory array
 */
export function paginateAndSortArray<T>(
  items: T[],
  params: PaginationParams,
  sortFn?: (a: T, b: T) => number
): PaginatedResult<T> {
  let sorted = [...items];

  if (sortFn) {
    sorted.sort(sortFn);
  } else if (params.sortBy) {
    const key = params.sortBy as keyof T;
    const multiplier = params.sortOrder === 'desc' ? -1 : 1;
    sorted.sort((a, b) => {
      const aVal = a[key];
      const bVal = b[key];
      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      return (aVal < bVal ? -1 : 1) * multiplier;
    });
  }

  return paginateArray(sorted, params.page, params.limit ?? params.pageSize ?? DEFAULT_PAGE_SIZE);
}

// ────────────────────────────────────────────────────────────────────────────
// SQL Query Helpers
// ────────────────────────────────────────────────────────────────────────────

export interface SQLPaginationClause {
  limitClause: string;
  offsetClause: string;
  combined: string;
  params: { limit: number; offset: number };
}

export function buildSQLPagination(params: PaginationParams): SQLPaginationClause {
  const limit = params.limit ?? params.pageSize ?? DEFAULT_PAGE_SIZE;
  const offset = calculateOffset(params.page, limit);
  return {
    limitClause: `LIMIT ${limit}`,
    offsetClause: `OFFSET ${offset}`,
    combined: `LIMIT ${limit} OFFSET ${offset}`,
    params: { limit, offset },
  };
}

export interface SQLOrderByClause {
  clause: string;
  column: string;
  direction: 'ASC' | 'DESC';
}

const ALLOWED_SORT_COLUMNS = new Set([
  'id',
  'created_at',
  'updated_at',
  'name',
  'title',
  'code',
  'status',
  'priority',
  'order',
  'sort_order',
]);

export function buildSQLOrderBy(
  params: PaginationParams,
  allowedColumns?: Set<string>,
  defaultColumn = 'created_at'
): SQLOrderByClause {
  const allowed = allowedColumns ?? ALLOWED_SORT_COLUMNS;
  const column = params.sortBy && allowed.has(params.sortBy) ? params.sortBy : defaultColumn;
  const direction = params.sortOrder === 'desc' ? 'DESC' : 'ASC';

  return {
    clause: `ORDER BY ${column} ${direction}`,
    column,
    direction,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Cursor-Based Pagination
// ────────────────────────────────────────────────────────────────────────────

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

export function parseCursorParams(query: Record<string, unknown>): CursorPaginationParams {
  return {
    cursor: typeof query.cursor === 'string' ? query.cursor : undefined,
    limit: parsePageSize(query.limit),
    direction: query.direction === 'backward' ? 'backward' : 'forward',
  };
}

export function encodeCursor(id: string, timestamp?: Date): string {
  const ts = timestamp?.toISOString() || new Date().toISOString();
  return Buffer.from(`${id}:${ts}`).toString('base64');
}

export function decodeCursor(cursor: string): { id: string; timestamp: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [id, timestamp] = decoded.split(':');
    if (!id || !timestamp) return null;
    return { id, timestamp };
  } catch {
    return null;
  }
}

export function buildCursorPaginatedResult<T extends { id: string }>(
  data: T[],
  limit: number,
  getTimestamp?: (item: T) => Date
): CursorPaginatedResult<T> {
  const hasMore = data.length > limit;
  const items = hasMore ? data.slice(0, limit) : data;

  let nextCursor: string | null = null;
  let prevCursor: string | null = null;

  if (items.length > 0) {
    const last = items[items.length - 1];
    const first = items[0];
    nextCursor = hasMore ? encodeCursor(last.id, getTimestamp?.(last)) : null;
    prevCursor = encodeCursor(first.id, getTimestamp?.(first));
  }

  return {
    data: items,
    nextCursor,
    prevCursor,
    hasMore,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Re-export types
// ────────────────────────────────────────────────────────────────────────────

export type { PaginationParams, PaginatedResult, PaginatedMeta } from '@dos/types';
