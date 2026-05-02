/**
 * Unified Express error middleware for dsoc-service.
 *
 * - Zod validation errors → 400 with issue list.
 * - Known app errors (error.status) → that status + JSON body.
 * - Unknown errors → 500 with a stable { code: 'internal_error' } body;
 *   stack only in non-production.
 *
 * Emits an audit event on 5xx via the DSOCPort itself (self-audit) so
 * any operator / SIEM consumer sees the failure. The audit emission
 * is best-effort — a failure there never shadows the real response.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { tryGetDSOCPort } from '@dos/dsoc-core';

interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

export function dsocErrorMiddleware(
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

  // Self-audit on server errors. Best-effort; silent on failure.
  if (status >= 500) {
    const port = tryGetDSOCPort();
    if (port) {
      const tenantId = (req as any).user?.tenantId ?? (req.header('x-tenant-id') ?? 'unknown');
      port
        .recordAuditEvent({
          tenantId,
          category: 'threat',
          severity: 'high',
          actor: { type: 'service', id: 'dsoc-service' },
          action: 'dsoc.internal_error',
          outcome: 'failure',
          occurredAt: new Date().toISOString(),
          attributes: {
            path: req.path,
            method: req.method,
            errorCode: body.code,
            errorMessage: body.message,
          },
        })
        .catch(() => { /* suppress — audit failure must not cascade */ });
    }
  }
}
