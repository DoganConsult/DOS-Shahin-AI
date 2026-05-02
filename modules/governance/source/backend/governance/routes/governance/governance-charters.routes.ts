import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../ports/auth.port';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import {
  listCharters, getCharterById, createCharter, updateCharter,
  approveCharter, activateCharter, getCharterForCommittee,
} from '../../services/governance/governance-charters.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createCharterBody, updateCharterBody, createApproveBody, createActivateBody } from "../../schemas/governance.schemas";

const router = Router();
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { committee_id, status } = req.query;
  const rows = await listCharters(tenantId, {
  committee_id: committee_id as string,
  status: status as string,
  });
  res.json({ charters: rows, count: rows.length });
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const charter = await getCharterById(req.tenantId, req.params.id);
  res.json(charter);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createCharterBody }), asyncHandler(async (req, res) => {
  const result = await createCharter(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_charter', entityId: result?.charter_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_charter', entityId: result?.charter_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_charter.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateCharterBody }), asyncHandler(async (req, res) => {
  try {
  const result = await updateCharter(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'governance_charter', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_charter', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_charter.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/:id/approve', authenticate, requirePermission('governance.record.write'), validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
  try {
  const result = await approveCharter(req.tenantId, req.params.id, req.user?.userId);
  setAuditData(res as any, { action: 'update', entityType: 'governance_charter', entityId: req.params.id, afterState: { status: 'approved' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'approved', entityType: 'governance_charter', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_charter.approved' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/:id/activate', authenticate, requirePermission('governance.record.write'), validate({ body: createActivateBody }), asyncHandler(async (req, res) => {
  try {
  const result = await activateCharter(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'governance_charter', entityId: req.params.id, afterState: { status: 'active' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'activated', entityType: 'governance_charter', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_charter.activated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') || toErrorMessage(err).includes('not approved') ? 400 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.get('/committee/:committeeId', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getCharterForCommittee(req.tenantId, req.params.committeeId);
  res.json(result || null);
}));

export default router;

