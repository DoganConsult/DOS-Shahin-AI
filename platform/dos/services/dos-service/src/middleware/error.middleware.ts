/**
 * Unified Express error middleware for dos-service.
 * Same shape as dsoc / dnoc. On 5xx we self-publish a platform event
 * (dos.service.internal_error) so the event-log row is persistent —
 * dos-service's own failures become queryable + replayable.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { tryGetDOSPort } from '@dos/dos-core';

interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export function dosErrorMiddleware(
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
    const port = tryGetDOSPort();
    if (port) {
      const tenantId = (req as any).user?.tenantId ?? req.header('x-tenant-id') ?? 'unknown';
      port
        .publishEvent({
          eventType: 'dos.service.internal_error',
          tenantId,
          occurredAt: new Date().toISOString(),
          payload: {
            path: req.path,
            method: req.method,
            code: body.code,
            message: body.message,
          },
        })
        .catch(() => { /* swallow — self-event failure must not cascade */ });
    }
  }
}
