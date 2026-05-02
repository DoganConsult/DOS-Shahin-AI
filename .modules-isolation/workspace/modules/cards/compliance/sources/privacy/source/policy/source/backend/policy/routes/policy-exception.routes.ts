import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Policy Exception Routes
// API endpoints for policy exception lifecycle:
// list, create, approve, reject, renew, close.
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, moduleStack, injectScopeContext } from '../ports/middleware.port';
import { errMsg } from '../../../i18n/error-messages';

import { createPolicyBody, createApproveBody, createRejectBody, createRenewBody, createCloseBody } from '../schemas/policy.schemas';
import {
  listExceptions,
  createExceptionRequest,
  getException,
  approveException,
  rejectException,
  renewException,
  closeException,
} from '../services/policy/policy-exception.service';

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware('policy'));
router.use(injectScopeContext);

/**
 * GET /
 * List policy exception requests with optional filters.
 * Query: ?status=pending&policyId=xxx&expiringBefore=2026-04-01
 */
router.get('/', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const filters = {
    status: req.query.status as string | undefined,
    policyId: req.query.policyId as string | undefined,
    expiringBefore: req.query.expiringBefore as string | undefined,
  };
  const exceptions = await listExceptions(tenantId, filters);
  res.json({ exceptions, count: exceptions.length });
}));

/**
 * POST /
 * Create a new policy exception request.
 * Body: { policyId, policyClauseScope?, reason, businessJustification?,
 *         compensatingControls?, riskAssessment?, priority? }
 */
router.post('/', authenticate, requirePermission('policy.document.write'), validate({ body: createPolicyBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }

  const { policyId, policyClauseScope, reason, businessJustification,
          compensatingControls, riskAssessment, priority } = req.body;
  if (!policyId || !reason) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }

  const exception = await createExceptionRequest(tenantId, {
    policyId,
    policyClauseScope,
    reason,
    businessJustification,
    compensatingControls,
    riskAssessment,
    requestedBy: userId,
    priority,
  });
  setAuditData(res as any, { action: 'create', entityType: 'policy_exception', entityId: (exception as any).exception_id, afterState: exception });
  res.status(201).json(exception);
}));

/**
 * GET /:id
 * Get a single policy exception by ID.
 */
router.get('/:id', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const exception = await getException(tenantId, req.params.id);
  if (!exception) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(exception);
}));

/**
 * POST /:id/approve
 * Approve a pending policy exception.
 * Body: { comment?, conditions?, expiryDate }
 */
router.post('/:id/approve', authenticate, requirePermission('policy.document.manage'), validate({ body: createApproveBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }

  const { comment, conditions, expiryDate } = req.body;
  if (!expiryDate) {
    res.status(400).json({ error: 'expiryDate is required' });
    return;
  }

  const result = await approveException(tenantId, req.params.id, userId, { comment, conditions, expiryDate });
  if (!result) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'policy_exception', entityId: req.params.id, afterState: result });
  res.json(result);
}));

/**
 * POST /:id/reject
 * Reject a pending policy exception.
 * Body: { reason, comment? }
 */
router.post('/:id/reject', authenticate, requirePermission('policy.document.manage'), validate({ body: createRejectBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }

  const { reason, comment } = req.body;
  if (!reason) {
    res.status(400).json({ error: 'reason is required' });
    return;
  }

  const result = await rejectException(tenantId, req.params.id, userId, { reason, comment });
  if (!result) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'policy_exception', entityId: req.params.id, afterState: result });
  res.json(result);
}));

/**
 * POST /:id/renew
 * Renew an approved/renewed policy exception with a new expiry date.
 * Body: { newExpiryDate, comment? }
 */
router.post('/:id/renew', authenticate, requirePermission('policy.document.manage'), validate({ body: createRenewBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }

  const { newExpiryDate, comment } = req.body;
  if (!newExpiryDate) {
    res.status(400).json({ error: 'newExpiryDate is required' });
    return;
  }

  const result = await renewException(tenantId, req.params.id, userId, { newExpiryDate, comment });
  if (!result) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'policy_exception', entityId: req.params.id, afterState: result });
  res.json(result);
}));

/**
 * POST /:id/close
 * Close a policy exception manually.
 * Body: { comment? }
 */
router.post('/:id/close', authenticate, requirePermission('policy.document.manage'), validate({ body: createCloseBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }

  const { comment } = req.body;
  const result = await closeException(tenantId, req.params.id, userId, comment);
  if (!result) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'policy_exception', entityId: req.params.id, afterState: result });
  res.json(result);
}));

export default router;

