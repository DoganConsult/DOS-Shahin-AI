import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listGovernanceObligations, getObligationById, createObligation, updateObligation,
  assignObligation as _assignObligation, getObligationDueDates, completeDueDate,
  getObligationEvidenceLinks, linkEvidenceToObligation,
  getObligationControlLinks, linkControlToObligation, requestExemption,
} from '../../../services/governance/governance-obligations.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createObligationBody = z.object({}).passthrough();

const updateObligationBody = z.object({}).passthrough();

const linkEvidenceBody = z.object({
  evidence_id: z.string().min(1),
}).passthrough();

const linkControlBody = z.object({
  control_id: z.string().min(1),
}).passthrough();

const requestExemptionBody = z.object({
  reason: z.string().optional(),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { createCompleteBody } from '../../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { mandate_id, status, owner_id } = req.query;
  const rows = await listGovernanceObligations(req.tenantId, {
  mandate_id: mandate_id as string,
  status: status as string,
  owner_id: owner_id as string,
  });
  res.json({ obligations: rows, count: rows.length });
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const result = await getObligationById(req.tenantId, req.params.id);
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createObligationBody }), asyncHandler(async (req, res) => {
  const result = await createObligation(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_obligation', entityId: result?.obligation_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_obligation', entityId: result?.obligation_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_obligation.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateObligationBody }), asyncHandler(async (req, res) => {
  try {
  const result = await updateObligation(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'governance_obligation', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_obligation', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_obligation.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.get('/:id/due-dates', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getObligationDueDates(req.tenantId, req.params.id);
  res.json({ dueDates: rows });
}));

router.post('/:id/due-dates/:dueDateId/complete', authenticate, requirePermission('governance.record.write'), validate({ body: createCompleteBody }), asyncHandler(async (req, res) => {
  try {
  const result = await completeDueDate(req.tenantId, req.params.dueDateId);
  setAuditData(res as any, { action: 'update', entityType: 'governance_obligation_due_date', entityId: req.params.dueDateId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_obligation', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_obligation.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.get('/:id/evidence-links', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getObligationEvidenceLinks(req.tenantId, req.params.id);
  res.json({ links: rows });
}));

router.post('/:id/evidence-links', authenticate, requirePermission('governance.record.write'), validate({ body: linkEvidenceBody }), asyncHandler(async (req, res) => {
  const result = await linkEvidenceToObligation(req.tenantId, req.params.id, {
  evidence_id: req.body.evidence_id,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_obligation_evidence_link', entityId: result?.link_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_obligation_evidence_link', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_obligation_evidence_link.created' });
  res.status(201).json(result);
}));

router.get('/:id/control-links', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getObligationControlLinks(req.tenantId, req.params.id);
  res.json({ links: rows });
}));

router.post('/:id/control-links', authenticate, requirePermission('governance.record.write'), validate({ body: linkControlBody }), asyncHandler(async (req, res) => {
  const result = await linkControlToObligation(req.tenantId, req.params.id, {
  control_id: req.body.control_id,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_obligation_control_link', entityId: result?.link_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_obligation_control_link', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_obligation_control_link.created' });
  res.status(201).json(result);
}));

router.post('/:id/exemptions', authenticate, requirePermission('governance.record.write'), validate({ body: requestExemptionBody }), asyncHandler(async (req, res) => {
  const result = await requestExemption(req.tenantId, req.params.id, {
  reason: req.body.reason,
  requested_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_obligation_exemption', entityId: result?.exemption_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_obligation_exemption', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_obligation_exemption.created' });
  res.status(201).json(result);
}));

export default router;

