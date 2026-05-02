// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission, validate, asyncHandler, setAuditData } from '../ports/playbooks.ports';
import * as service from '../services/playbooks.service';
import { CreateTemplateSchema, CreateStepSchema, ExecutePlaybookSchema, LogStepSchema } from '../schemas/playbooks.schemas';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
const genericRouteSchema = z.any();

const router = Router();

// §6: /api/playbooks/dashboard
router.get('/dashboard', authenticate, requirePermission('playbooks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const dashboard = await service.getDashboard(req.tenantId);
  res.json({ data: dashboard });
}));

// §6: /api/playbooks/templates
router.get('/templates', authenticate, requirePermission('playbooks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : undefined;
  const offset = req.query.offset ? parseInt(String(req.query.offset), 10) : undefined;
  const status = typeof req.query.status === 'string' ? req.query.status : undefined;
  const result = await service.listTemplates(req.tenantId, { limit, offset, status });
  res.json(result);
}));

router.post('/templates', authenticate, requirePermission('playbooks.manage'), validate({ body: CreateTemplateSchema }), asyncHandler(async (req: any, res: any) => {
  const template = await service.createTemplate(req.tenantId, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'playbook_template', entityId: template.id, afterState: template });
  res.status(201).json({ data: template });
}));

router.get('/templates/:id', authenticate, requirePermission('playbooks.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: any, res: any) => {
  const detailed = await service.getTemplateDetailed(req.tenantId, req.params.id);
  res.json({ data: detailed });
}));

router.post('/templates/:id/steps', authenticate, requirePermission('playbooks.manage'), validate({ body: CreateStepSchema }), asyncHandler(async (req: any, res: any) => {
  const step = await service.addStep(req.tenantId, req.user.id, req.params.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'playbook_step', entityId: step.id, afterState: step });
  res.status(201).json({ data: step });
}));

// §6: /api/playbooks/executions
router.post('/templates/:id/execute', authenticate, requirePermission('playbooks.execute'), validate({ body: ExecutePlaybookSchema }), asyncHandler(async (req: any, res: any) => {
  const execution = await service.executePlaybook(req.tenantId, req.user.id, req.params.id, req.body.triggerSourceEntity);
  setAuditData(res, { action: 'create', entityType: 'playbook_execution', entityId: execution.id, afterState: execution });
  res.status(201).json({ data: execution });
}));

router.post('/executions/:id/log', authenticate, requirePermission('playbooks.execute'), validate({ body: LogStepSchema }), asyncHandler(async (req: any, res: any) => {
  const log = await service.logExecutionStep(req.tenantId, req.params.id, req.user.id, req.body);
  setAuditData(res, { action: 'create', entityType: 'playbook_execution_log', entityId: log.id, afterState: log });
  res.status(201).json({ data: log });
}));

router.post('/executions/:id/complete', authenticate, requirePermission('playbooks.execute'), validate({ body: genericRouteSchema }), asyncHandler(async (req: any, res: any) => {
  setAuditData(res, { action: 'update', entityType: 'playbook_execution', entityId: req.params.id, afterState: { status: 'completed' } });
  await service.completeExecution(req.tenantId, req.params.id, req.user.id);
  res.json({ data: { success: true } });
}));

export default router;

