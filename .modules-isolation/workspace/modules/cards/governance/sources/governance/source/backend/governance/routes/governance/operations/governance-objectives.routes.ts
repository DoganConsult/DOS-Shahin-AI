import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listObjectives, listObjectivesTree, getObjectiveById,
  createObjective, updateObjective, softDeleteObjective,
} from '../../../services/governance/governance-objectives.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createObjectiveBody = z.object({}).passthrough();

const updateObjectiveBody = z.object({}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { genericGovernanceSchema } from "../../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { status, category, owner_id } = req.query;
  const rows = await listObjectives(req.tenantId, {
  status: status as string,
  category: category as string,
  owner_id: owner_id as string,
  });
  res.json({ objectives: rows, count: rows.length });
}));

router.get('/tree', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await listObjectivesTree(req.tenantId);
  res.json({ objectives: rows, count: rows.length });
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const result = await getObjectiveById(req.tenantId, req.params.id);
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createObjectiveBody }), asyncHandler(async (req, res) => {
  const result = await createObjective(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_objective', entityId: result?.objective_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_objective', entityId: result?.objective_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_objective.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateObjectiveBody }), asyncHandler(async (req, res) => {
  try {
  const result = await updateObjective(req.tenantId, req.params.id, {
  ...req.body,
  updated_by: req.user?.userId,
  });
  setAuditData(res as any, { action: 'update', entityType: 'governance_objective', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_objective', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_objective.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.delete('/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const deleted = await softDeleteObjective(req.tenantId, req.params.id, req.user?.userId);
  if (!deleted) return res.status(404).json({ error: 'Objective not found' });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_objective', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_objective', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_objective.deleted' });
  res.json({ deleted: true });
}));

export default router;

