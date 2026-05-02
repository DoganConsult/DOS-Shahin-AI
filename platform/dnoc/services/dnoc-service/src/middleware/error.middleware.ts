/**
 * Unified Express error middleware for dnoc-service.
 *
 * - Zod validation errors → 400 with issue list.
 * - Known app errors (error.status) → that status.
 * - Unknown errors → 500 with stable { code: 'internal_error' }.
 *
 * Self-logs the error via the DNOC port itself — dogfooding our own
 * log sink. Best-effort; an emit failure never masks the response.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { tryGetDNOCPort } from '@dos/dnoc-core';

interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export function dnocErrorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      code: 'invalid_request',
      message: 'Request body failed schema validation.',
      details: { issues: err.issues },
    });
    return;
  }

  const status = typeof err.status === 'number' ? err.status : 500;
  const body: Record<string, unknown> = {
    code: err.code ?? (status >= 500 ? 'internal_error' : 'request_error'),
    message: err.message || 'Unexpected error.',
  };
  if (err.details !== undefined) body.details = err.details;
  if (process.env.NODE_ENV !== 'production' && err.stack) {
    body.stack = err.stack.split('\n').slice(0, 8);
  }

  res.status(status).json(body);

  if (status >= 500) {
    const port = tryGetDNOCPort();
    if (port) {
      try {
        port.emitLog({
          level: 'error',
          message: `[dnoc-service] ${req.method} ${req.path} → ${status}`,
          moduleCode: 'dnoc',
          tenantId: (req as any).user?.tenantId ?? req.header('x-tenant-id') ?? undefined,
          correlationId: req.header('x-correlation-id') ?? undefined,
          attributes: {
            errorCode: body.code,
            errorMessage: body.message,
          },
        });
      } catch { /* log sink failure is swallowed */ }
    }
  }
}
