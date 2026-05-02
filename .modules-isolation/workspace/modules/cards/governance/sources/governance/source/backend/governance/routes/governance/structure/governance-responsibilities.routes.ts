import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listResponsibilities, createResponsibility, updateResponsibility,
  listAssignments, createAssignment, removeAssignment,
  detectAccountabilityGaps,
} from '../../../services/governance/governance-responsibilities.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createResponsibilityBody = z.object({}).passthrough();

const updateResponsibilityBody = z.object({}).passthrough();

const createAssignmentBody = z.object({}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { genericGovernanceSchema } from "../../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await listResponsibilities(req.tenantId);
  res.json({ responsibilities: rows, count: rows.length });
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createResponsibilityBody }), asyncHandler(async (req, res) => {
  const result = await createResponsibility(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_responsibility', entityId: result?.responsibility_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_responsibility', entityId: result?.responsibility_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_responsibility.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateResponsibilityBody }), asyncHandler(async (req, res) => {
  try {
  const result = await updateResponsibility(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'governance_responsibility', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_responsibility', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_responsibility.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.get('/assignments', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { assignee_type, scope_type } = req.query;
  const rows = await listAssignments(req.tenantId, {
  assignee_type: assignee_type as string,
  scope_type: scope_type as string,
  });
  res.json({ assignments: rows, count: rows.length });
}));

router.post('/assignments', authenticate, requirePermission('governance.record.write'), validate({ body: createAssignmentBody }), asyncHandler(async (req, res) => {
  const result = await createAssignment(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_responsibility_assignment', entityId: result?.assignment_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_responsibility_assignment', entityId: result?.assignment_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_responsibility_assignment.created' });
  res.status(201).json(result);
}));

router.delete('/assignments/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const deleted = await removeAssignment(req.tenantId, req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Assignment not found' });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_responsibility_assignment', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_responsibility_assignment', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_responsibility_assignment.deleted' });
  res.json({ deleted: true });
}));

router.get('/gaps', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await detectAccountabilityGaps(req.tenantId);
  res.json({ gaps: rows, count: rows.length });
}));

export default router;

