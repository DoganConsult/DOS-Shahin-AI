import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listMandates, getMandateById, createMandate, updateMandate, softDeleteMandate,
  getMandateSources, addMandateSource, removeMandateSource,
} from '../../../services/governance/governance-mandates.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createMandateBody = z.object({}).passthrough();

const updateMandateBody = z.object({}).passthrough();

const addMandateSourceBody = z.object({}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { genericGovernanceSchema } from "../../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { status, priority, jurisdiction } = req.query;
  const rows = await listMandates(req.tenantId, {
  status: status as string,
  priority: priority as string,
  jurisdiction: jurisdiction as string,
  });
  res.json({ mandates: rows, count: rows.length });
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const result = await getMandateById(req.tenantId, req.params.id);
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createMandateBody }), asyncHandler(async (req, res) => {
  const result = await createMandate(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_mandate', entityId: result?.mandate_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_mandate', entityId: result?.mandate_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_mandate.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateMandateBody }), asyncHandler(async (req, res) => {
  try {
  const result = await updateMandate(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'governance_mandate', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_mandate', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_mandate.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.delete('/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const deleted = await softDeleteMandate(req.tenantId, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Mandate not found' });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_mandate', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_mandate', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_mandate.deleted' });
  res.json({ deleted: true });
}));

router.get('/:id/sources', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getMandateSources(req.tenantId, req.params.id);
  res.json({ sources: rows, count: rows.length });
}));

router.post('/:id/sources', authenticate, requirePermission('governance.record.write'), validate({ body: addMandateSourceBody }), asyncHandler(async (req, res) => {
  const result = await addMandateSource(req.tenantId, req.params.id, {
  ...req.body,
  source_type: req.body.source_type || 'regulation',
  source_name: req.body.document_title || req.body.source_name,
  source_url: req.body.document_url || req.body.source_url,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_mandate_source', entityId: result?.source_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_mandate_source', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_mandate_source.created' });
  res.status(201).json(result);
}));

router.delete('/:id/sources/:sourceId', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const deleted = await removeMandateSource(req.tenantId, req.params.sourceId);
  if (!deleted) return res.status(404).json({ error: 'Source not found' });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_mandate_source', entityId: req.params.sourceId });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_mandate_source', entityId: req.params.sourceId || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_mandate_source.deleted' });
  res.json({ deleted: true });
}));

export default router;

