// ============================================
// Exception Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action as _action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {
  requestException, approveException, rejectException,
  checkExpiring, expireOverdue, getExceptions,
} from '../services/exception.service';

// ── EXCEPTION CRUD ─────────────────────────────────────

export async function listExceptionRequests(req: AuthenticatedRequest, res: Response): Promise<void> {
  const filters: Record<string, unknown> = {};
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.controlId) filters.controlId = req.query.controlId as string;
  const result = await getExceptions(req.tenantId!, filters as Record<string, unknown>);
  res.json(ok(result, req));
}

export async function getExceptionRequestById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  // Fetch all with no filters and find by id (service returns ExceptionRecord[])
  const all = await getExceptions(req.tenantId!);
  const exception = all.find((e) => e.exceptionId === id);
  if (!exception) throw new NotFoundError('exception', id);
  res.json(ok(exception, req));
}

export async function createExceptionRequest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await requestException(req.tenantId!, {
    ...req.body,
    requestedBy: req.body.requestedBy || userId,
  });
  setAuditData(res as any, { action: 'create', entityType: 'exception', entityId: result?.exceptionId, afterState: result });
  res.status(201).json(ok(result, req));
}

// ── APPROVAL WORKFLOW ──────────────────────────────────

export async function approve(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const approverId = req.user!.userId!;
  const result = await approveException(req.tenantId!, id, approverId);
  setAuditData(res as any, { action: 'update', entityType: 'exception', entityId: id, afterState: result });
  res.json(ok(result, req));
}

export async function reject(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const approverId = req.user!.userId!;
  const reason = req.body.reason || 'Rejected';
  const result = await rejectException(req.tenantId!, id, approverId, reason);
  setAuditData(res as any, { action: 'update', entityType: 'exception', entityId: id, afterState: result });
  res.json(ok(result, req));
}

// ── EXPIRY MANAGEMENT ──────────────────────────────────

export async function checkExpiringExceptions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const thresholdDays = parseInt(req.query.thresholdDays as string, 10) || 30;
  const result = await checkExpiring(req.tenantId!, thresholdDays);
  res.json(ok(result, req));
}

export async function expireOverdueExceptions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await expireOverdue(req.tenantId!);
  setAuditData(res as any, { action: 'update', entityType: 'exception_expiry' });
  res.json(ok({ expired: result, count: result.length }, req));
}
