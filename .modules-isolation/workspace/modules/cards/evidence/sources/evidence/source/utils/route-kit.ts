// Phase 11 (M5) — route-kit local shim for evidence module.
// The canonical source of these helpers is @dos/platform-core/http;
// this file wraps them so existing evidence route code that imports
// `'../../../../utils/route-kit'` from dist/backend/evidence/routes/*
// resolves at runtime. With rootDir=source this compiles to
// dist/utils/route-kit.js, which is the path 4 levels up from the
// compiled route file.

import type { Request, Response } from 'express';
import type { ApiActionResponse, ApiPaginatedResponse, ApiSuccessResponse } from '@dos/types/express';

export { validate, asyncHandler } from '@dos/platform-core/http';

function resolveRequestId(req?: Request, res?: Response): string {
  return (req as any)?.correlationId || (res?.req as any)?.correlationId || 'unknown';
}

/**
 * Standard success envelope builder.
 *
 * Supports both patterns used across extracted module routes:
 * - `ok(res, data)` sends the response immediately (platform-core style)
 * - `res.json(ok(data, req))` returns the envelope (route-kit style)
 */
export function ok<T>(res: Response, data: T): void;
export function ok<T>(data: T, req?: Request): ApiSuccessResponse<T>;
export function ok<T>(arg1: Response | T, arg2?: T | Request): void | ApiSuccessResponse<T> {
  const isResponseLike =
    typeof (arg1 as any)?.json === 'function' &&
    typeof (arg1 as any)?.status === 'function' &&
    typeof (arg1 as any)?.send === 'function';

  if (isResponseLike) {
    const res = arg1 as Response;
    const data = arg2 as T;
    res.json({
      success: true,
      data,
      meta: { requestId: resolveRequestId(undefined, res), timestamp: new Date().toISOString() },
    } satisfies ApiSuccessResponse<T>);
    return;
  }

  const data = arg1 as T;
  const req = arg2 as Request | undefined;
  return {
    success: true,
    data,
    meta: { requestId: resolveRequestId(req), timestamp: new Date().toISOString() },
  };
}

/**
 * Standard action envelope builder.
 *
 * Supports both patterns used across extracted module routes:
 * - `action(res, message)` sends the response immediately (platform-core style)
 * - `res.json(action(message, req))` returns the envelope (route-kit style)
 */
export function action(res: Response, message: string): void;
export function action(message: string, req?: Request): ApiActionResponse;
export function action(arg1: Response | string, arg2?: string | Request): void | ApiActionResponse {
  const isResponseLike =
    typeof (arg1 as any)?.json === 'function' &&
    typeof (arg1 as any)?.status === 'function' &&
    typeof (arg1 as any)?.send === 'function';

  if (isResponseLike) {
    const res = arg1 as Response;
    const message = arg2 as string;
    res.json({
      success: true,
      message,
      meta: { requestId: resolveRequestId(undefined, res), timestamp: new Date().toISOString() },
    } satisfies ApiActionResponse);
    return;
  }

  const message = arg1 as string;
  const req = arg2 as Request | undefined;
  return {
    success: true,
    message,
    meta: { requestId: resolveRequestId(req), timestamp: new Date().toISOString() },
  };
}

/**
 * Standard paginated envelope builder.
 *
 * Supports both patterns used across extracted module routes:
 * - `paginated(res, rows, total, page, pageSize)` sends the response immediately (platform-core style)
 * - `res.json(paginated(rows, total, page, pageSize, req))` returns the envelope (route-kit style)
 */
export function paginated<T>(res: Response, data: T[], total: number, page: number, pageSize: number): void;
export function paginated<T>(data: T[], total: number, page: number, pageSize: number, req?: Request): ApiPaginatedResponse<T>;
export function paginated<T>(
  arg1: Response | T[],
  arg2: T[] | number,
  arg3: number,
  arg4: number,
  arg5?: number,
  arg6?: Request,
): void | ApiPaginatedResponse<T> {
  const isResponseLike =
    typeof (arg1 as any)?.json === 'function' &&
    typeof (arg1 as any)?.status === 'function' &&
    typeof (arg1 as any)?.send === 'function';

  if (isResponseLike) {
    const res = arg1 as Response;
    const data = arg2 as T[];
    const total = arg3;
    const page = arg4;
    const pageSize = arg5 as number;

    res.json({
      success: true,
      data,
      meta: {
        requestId: resolveRequestId(undefined, res),
        timestamp: new Date().toISOString(),
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / Math.max(1, pageSize)),
      },
    } satisfies ApiPaginatedResponse<T>);
    return;
  }

  const data = arg1 as T[];
  const total = arg2 as number;
  const page = arg3;
  const pageSize = arg4;
  const req = arg5 as Request | undefined;
  return {
    success: true,
    data,
    meta: {
      requestId: resolveRequestId(req),
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
  constructor(message: string);
  constructor(entity: string, id?: string | number);
  constructor(arg1: string, arg2?: string | number) {
    const message = arg2 === undefined ? arg1 : `${arg1} not found: ${arg2}`;
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
