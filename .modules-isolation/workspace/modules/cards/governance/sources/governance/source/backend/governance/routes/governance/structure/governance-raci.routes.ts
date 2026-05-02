import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { emitEvent } from '../../../ports/events.port';
import * as raciService from '../../../services/governance/governance-raci.service';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createTemplateBody = z.object({}).passthrough();

const updateTemplateBody = z.object({}).passthrough();

const setAssignmentsBody = z.object({
  assignments: z.array(z.any()),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { createActivateBody, createArchiveBody } from '../../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await raciService.listTemplates(req.tenantId);
  res.json(result);
}));

router.get('/matrix', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await raciService.getCompiledMatrix(req.tenantId);
  res.json(result);
}));

router.get('/accountability-gaps', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await raciService.getAccountabilityGaps(req.tenantId);
  res.json(result);
}));

router.get('/sod-conflicts', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await raciService.getSodConflicts(req.tenantId);
  res.json(result);
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await raciService.getTemplateById(req.tenantId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Template not found' });
  res.json(result);
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createTemplateBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await raciService.createTemplate(tenantId, req.body, userId);
  setAuditData(res as any, { action: 'create', entityType: 'governance_raci_template', entityId: result.template_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'created', entityType: 'governance_raci', entityId: result.template_id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_raci.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateTemplateBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await raciService.updateTemplate(tenantId, req.params.id, req.body);
  if (!result) return res.status(404).json({ error: 'Template not found' });
  setAuditData(res as any, { action: 'update', entityType: 'governance_raci_template', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'updated', entityType: 'governance_raci', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_raci.updated' });
  res.json(result);
}));

router.post('/:id/assignments', authenticate, requirePermission('governance.record.write'), validate({ body: setAssignmentsBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { assignments } = req.body;
  if (!Array.isArray(assignments)) return res.status(400).json({ error: 'assignments array required' });
  const result = await raciService.setAssignments(tenantId, req.params.id, assignments);
  setAuditData(res as any, { action: 'update', entityType: 'governance_raci_assignment', entityId: req.params.id, afterState: { count: result.count } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'updated', entityType: 'governance_raci', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_raci.updated' });
  res.json(result);
}));

router.post('/:id/activate', authenticate, requirePermission('governance.record.write'), validate({ body: createActivateBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await raciService.activateTemplate(tenantId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Template not found' });
  setAuditData(res as any, { action: 'update', entityType: 'governance_raci_template', entityId: req.params.id, afterState: { status: 'active' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'activated', entityType: 'governance_raci', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_raci.activated' });
  res.json(result);
}));

router.post('/:id/archive', authenticate, requirePermission('governance.record.write'), validate({ body: createArchiveBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const result = await raciService.archiveTemplate(tenantId, req.params.id);
  if (!result) return res.status(404).json({ error: 'Template not found' });
  setAuditData(res as any, { action: 'update', entityType: 'governance_raci_template', entityId: req.params.id, afterState: { status: 'archived' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'governance', event: 'archived', entityType: 'governance_raci', entityId: req.params.id } as any)), { tenantId: tenantId, operation: 'grcEvent:governance.governance_raci.archived' });
  res.json(result);
}));

export default router;

