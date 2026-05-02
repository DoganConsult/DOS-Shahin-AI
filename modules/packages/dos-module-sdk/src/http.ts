import type { Request, Response, NextFunction, RequestHandler } from 'express';

export function asyncHandler(
  fn: (req: any, res: Response, next?: NextFunction) => Promise<void>,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export interface ResponseHelpers {
  ok(data: unknown): void;
  created(data: unknown): void;
  deleted(message: string): void;
  paginated(data: unknown[], total: number, page: number, pageSize: number): void;
}

export function buildMeta(req?: { correlationId?: string } | null): { requestId: string; timestamp: string } {
  return {
    requestId: req?.correlationId || 'unknown',
    timestamp: new Date().toISOString(),
  };
}

export function sendOk(res: Response, data: unknown, req: { correlationId?: string }): void {
  res.status(200).json({ success: true, data, meta: buildMeta(req) });
}

export function sendCreated(res: Response, data: unknown, req: { correlationId?: string }): void {
  res.status(201).json({ success: true, data, meta: buildMeta(req) });
}

export function sendAction(res: Response, message: string, req: { correlationId?: string }): void {
  res.status(200).json({ success: true, message, meta: buildMeta(req) });
}

export function sendPaginated<T>(
  res: Response,
  data: T[],
  total: number,
  page: number,
  pageSize: number,
  req: { correlationId?: string },
): void {
  res.status(200).json({
    success: true,
    data,
    meta: {
      ...buildMeta(req),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    },
  });
}

/**
 * Send an error response. Mirrors `backend/src/utils/http-error.util#sendError`.
 * If the caught error has a statusCode/status property use it; otherwise use fallbackStatus.
 * For 5xx errors, the client message is sanitised unless the message matches a known-safe pattern.
 */
const SAFE_ERROR_PATTERNS = [
  /^Missing required field/,
  /^Invalid .+ format$/,
  /^Session not found$/,
  /^Job not found$/,
  /^already registered$/i,
  /^blocked/i,
  /^Provisioning job/,
  /^No provisioning/,
  /^Onboarding session/,
];

export function sendError(
  res: Response,
  err: unknown,
  fallbackStatus = 500,
  fallbackMessage = 'Internal server error',
): void {
  const msg = err instanceof Error ? err.message : String(err ?? fallbackMessage);
  if (fallbackStatus < 500) {
    res.status(fallbackStatus).json({ error: msg });
    return;
  }
  const errObj = err as Record<string, unknown> | null | undefined;
  const status =
    typeof (errObj as Record<string, unknown> | null | undefined)?.["statusCode"] === 'number'
      ? ((errObj as Record<string, unknown>)["statusCode"] as number)
      : typeof (errObj as Record<string, unknown> | null | undefined)?.["status"] === 'number'
        ? ((errObj as Record<string, unknown>)["status"] as number)
        : fallbackStatus;
  const clientMsg = SAFE_ERROR_PATTERNS.some((p) => p.test(msg)) ? msg : fallbackMessage;
  res.status(status).json({ error: clientMsg });
}

// toErrorMessage is exported from ./errors — imported here for convenience

// ────────────────────────────────────────────────────────────────────────────
// Response envelope helpers (types imported from @dos/types)
// ────────────────────────────────────────────────────────────────────────────

import type { ApiSuccessResponse, ApiPaginatedResponse, ApiActionResponse } from '@dos/types';

type PaginationQueryLike = {
  page?: unknown;
  pageSize?: unknown;
  limit?: unknown;
  offset?: unknown;
};

function toSafeInt(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function resolvePagination(
  total: number,
  pageOrQuery?: number | PaginationQueryLike,
  pageSizeOrReq?: number | ({ correlationId?: string } | Record<string, unknown>),
  reqMaybe?: { correlationId?: string } | Record<string, unknown>,
): { page: number; pageSize: number; req: { correlationId?: string } | Record<string, unknown> } {
  if (typeof pageOrQuery === 'number' && typeof pageSizeOrReq === 'number') {
    return { page: Math.max(1, pageOrQuery), pageSize: Math.max(1, pageSizeOrReq), req: reqMaybe ?? {} };
  }

  const query = (pageOrQuery ?? {}) as PaginationQueryLike;
  const limit = Math.max(1, Math.min(200, toSafeInt(query.limit ?? query.pageSize, 25)));
  const offset = Math.max(0, toSafeInt(query.offset, 0));
  const page = Math.max(1, toSafeInt(query.page, Math.floor(offset / limit) + 1));
  const pageSize = Math.max(1, Math.min(200, toSafeInt(query.pageSize, limit)));
  const req = (pageSizeOrReq ?? {}) as { correlationId?: string } | Record<string, unknown>;
  void total;
  return { page, pageSize, req };
}

/**
 * Wrap data in the standard success envelope.
 */
export function ok<T>(data: T): ApiSuccessResponse<T>;
export function ok<T>(data: T, req: { correlationId?: string } | Record<string, unknown>): ApiSuccessResponse<T>;
export function ok<T>(data: T, req?: { correlationId?: string } | Record<string, unknown>): ApiSuccessResponse<T> {
  return { success: true, data, meta: buildMeta((req ?? {}) as { correlationId?: string }) };
}

/**
 * Wrap a list result in the paginated envelope.
 */
export function paginated<T>(data: T[], total: number, page: number, pageSize: number, req: { correlationId?: string } | Record<string, unknown>): ApiPaginatedResponse<T>;
export function paginated<T>(data: T[], total: number, query: PaginationQueryLike, req?: { correlationId?: string } | Record<string, unknown>): ApiPaginatedResponse<T>;
export function paginated<T>(
  data: T[],
  total: number,
  pageOrQuery: number | PaginationQueryLike,
  pageSizeOrReq?: number | ({ correlationId?: string } | Record<string, unknown>),
  reqMaybe?: { correlationId?: string } | Record<string, unknown>,
): ApiPaginatedResponse<T> {
  const { page, pageSize, req } = resolvePagination(total, pageOrQuery, pageSizeOrReq, reqMaybe);
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    success: true,
    data,
    meta: {
      ...buildMeta(req as { correlationId?: string }),
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Wrap an action result (create, update, delete) with a message.
 */
export function action(message: string): ApiActionResponse;
export function action(message: string, req: { correlationId?: string } | Record<string, unknown>): ApiActionResponse;
export function action(message: string, req?: { correlationId?: string } | Record<string, unknown>): ApiActionResponse {
  return { success: true, message, meta: buildMeta((req ?? {}) as { correlationId?: string }) };
}
