import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Governance Delegation Routes — consumes DAuth delegation service (Law 2)
 */
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {

  listDelegations, getDelegationById, createDelegation, updateDelegation,

  revokeDelegation, getExpiringDelegations, detectAuthorityConflicts,

  listAuthorityLevels, upsertAuthorityLevel,

  requestDelegation, approveDelegation, rejectDelegation,

  expireOverdueDelegations,
} from '../../../services/governance/governance-delegations.service.js';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const upsertAuthorityLevelBody = z.object({}).passthrough();

const createDelegationBody = z.object({}).passthrough();

const updateDelegationBody = z.object({}).passthrough();

const requestDelegationBody = z.object({}).passthrough();

const rejectDelegationBody = z.object({
  reason: z.string().min(1),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { createApproveBody, createRevokeBody, createExpireOverdueBody } from '../../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { status, delegator, delegate } = req.query;
  const rows = await listDelegations(req.tenantId, {
  status: status as string,
  delegator_user_id: delegator as string,
  delegate_user_id: delegate as string,
  });
  res.json({ delegations: rows, count: rows.length });
}));

router.get('/expiring', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days as string, 10) || 30;
  const rows = await getExpiringDelegations(req.tenantId, days);
  res.json({ delegations: rows, count: rows.length });
}));

router.get('/conflicts', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await detectAuthorityConflicts(req.tenantId);
  res.json({ conflicts: rows, count: rows.length });
}));

router.get('/authority-levels', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await listAuthorityLevels(req.tenantId);
  res.json({ levels: rows, count: rows.length });
}));

router.post('/authority-levels', authenticate, requirePermission('governance.record.write'), validate({ body: upsertAuthorityLevelBody }), asyncHandler(async (req, res) => {
  const result = await upsertAuthorityLevel(req.tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'governance_authority_level', afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_authority_level', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_authority_level.created' });
  res.status(201).json(result || { message: 'Already exists' });
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const result = await getDelegationById(req.tenantId, req.params.id);
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createDelegationBody }), asyncHandler(async (req, res) => {
  const result = await createDelegation(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });
  setAuditData(res as any, { action: 'create', entityType: 'governance_delegation', entityId: result?.delegation_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_delegation', entityId: result?.delegation_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_delegation.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateDelegationBody }), asyncHandler(async (req, res) => {
  try {
  const result = await updateDelegation(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'governance_delegation', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_delegation', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_delegation.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

// POST /request — Create delegation with approval workflow
router.post('/request', authenticate, requirePermission('governance.record.write'), validate({ body: requestDelegationBody }), asyncHandler(async (req, res) => {
  const result = await requestDelegation(req.tenantId, {
  ...req.body,
  requested_by: req.user!.userId!,
  });
  setAuditData(res as any, { action: 'create', entityType: 'governance_delegation', entityId: result.delegation?.delegation_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_delegation', entityId: result.delegation?.delegation_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_delegation.created' });
  res.status(201).json(result);
}));

// POST /:id/approve — Approve a pending delegation
router.post('/:id/approve', authenticate, requirePermission('governance.record.write'), validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
  try {
  const result = await approveDelegation(req.tenantId, req.params.id, req.user!.userId!);
  setAuditData(res as any, { action: 'update', entityType: 'governance_delegation', entityId: req.params.id, afterState: { status: 'active' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_delegation', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_delegation.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

// POST /:id/reject — Reject a pending delegation
router.post('/:id/reject', authenticate, requirePermission('governance.record.write'), validate({ body: rejectDelegationBody }), asyncHandler(async (req, res) => {
  try {
  const { reason } = req.body;
  if (!reason) { res.status(400).json({ error: 'reason is required' }); return; }
  const result = await rejectDelegation(req.tenantId, req.params.id, req.user!.userId!, reason);
  setAuditData(res as any, { action: 'update', entityType: 'governance_delegation', entityId: req.params.id, afterState: { status: 'rejected' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_delegation', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_delegation.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/:id/revoke', authenticate, requirePermission('governance.record.write'), validate({ body: createRevokeBody }), asyncHandler(async (req, res) => {
  try {
  const result = await revokeDelegation(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'governance_delegation', entityId: req.params.id, afterState: { status: 'revoked' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_delegation', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_delegation.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') || toErrorMessage(err).includes('already revoked') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/expire-overdue', authenticate, requirePermission('governance.record.write'), validate({ body: createExpireOverdueBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const count = await expireOverdueDelegations(tenantId);
  setAuditData(res as any, { action: 'update', entityType: 'governance_delegation_expiry', afterState: { expired_count: count } });
  res.json({ expired: count });
}));

export default router;

