// Phase 2 (workflow module) — route-kit local shim for the workflow module.
// Mirrors modules/evidence/source/utils/route-kit.ts. Re-exports the canonical
// helpers from @dos/platform-core/http so the pre-existing route files that
// import '../../utils/route-kit' resolve at runtime (compiled path:
// modules/workflow/dist/workflow/utils/route-kit.js).
//
// Keep this file lean: helpers that are not in platform-core are defined
// here (NotFoundError / ValidationError / parsePagination) because they are
// exercised by the extracted workflow route files.

export { validate, action, asyncHandler } from '@dos/platform-core/http';

import type { Request } from 'express';

/**
 * Workflow-local `ok(data, req)` envelope builder.
 *
 * Returns the envelope object — caller passes the result to res.json().
 * This is intentionally different from `@dos/platform-core/http.ok(res, data)`
 * which calls res.json itself. The workflow handlers were written against
 * the envelope-builder pattern (`res.json(ok(data, req))`); importing the
 * platform-core variant turned every handler into a runtime crash:
 * `result.rows.json is not a function` when `ok(result.rows, req)` was
 * mis-resolved as `ok(res, data)`.
 *
 * Shape kept identical to platform-core's response so downstream
 * consumers see the same envelope across modules.
 */
export function ok<T = unknown>(data: T, req?: Request): { success: true; data: T; meta: { requestId: string; timestamp: string } } {
  return {
    success: true,
    data,
    meta: {
      requestId: (req as any)?.correlationId || 'unknown',
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * Workflow-local `paginated(data, total, page, pageSize, req)` envelope builder.
 *
 * Same divergence reason as `ok` above: handlers were written against
 * `res.json(paginated(rows, total, page, pageSize, req))` but the
 * platform-core variant is `paginated(res, data, total, page, pageSize)`
 * and calls res.json itself, so `paginated(rows, total, ...)` ended up
 * calling `rows.json(...)` and crashing with "res.json is not a function".
 */
export function paginated<T = unknown>(
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  req?: Request,
): { success: true; data: T[]; meta: { requestId: string; timestamp: string; page: number; pageSize: number; total: number; totalPages: number } } {
  return {
    success: true,
    data,
    meta: {
      requestId: (req as any)?.correlationId || 'unknown',
      timestamp: new Date().toISOString(),
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / Math.max(1, pageSize)),
    },
  };
}

export class NotFoundError extends Error {
  readonly statusCode = 404;
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends Error {
  readonly statusCode = 400;
  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export interface Pagination {
  page: number;
  pageSize: number;
  offset: number;
}

/** Parse `?page=&pageSize=` query params with defensive defaults. */
export function parsePagination(query: Record<string, unknown>, defaults: { page?: number; pageSize?: number } = {}): Pagination {
  const rawPage = query['page'];
  const rawPageSize = query['pageSize'] ?? query['limit'];
  const page = Math.max(1, Number.parseInt(String(rawPage ?? defaults.page ?? 1), 10) || 1);
  const pageSize = Math.min(200, Math.max(1, Number.parseInt(String(rawPageSize ?? defaults.pageSize ?? 25), 10) || 25));
  return { page, pageSize, offset: (page - 1) * pageSize };
}
