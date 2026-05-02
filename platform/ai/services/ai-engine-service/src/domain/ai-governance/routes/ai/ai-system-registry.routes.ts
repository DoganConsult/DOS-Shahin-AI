import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  registerAiSystem,
  getAiSystem,
  listAiSystems,
  classifyRisk,
  decommissionSystem,
  getAuditTrail,
  triggerReassessment,
  getConformityStatus,
  recordGoNoGoDecision,
} from '../../services/ai/registry/ai-system-registry.service';
import { emitAiGovernanceEvent } from '../../services/ai/operations/ai-governance-event.service';
import { enforceStatusTransition } from '../../ports/platform.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { registerBody, goNoGoBody, createClassifyBody, createReassessBody, createDecommissionBody } from "../../schemas/ai-governance.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(automationMiddleware('ai-governance'));

router.get('/', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const systems = await listAiSystems(req.tenantId);
  res.json({ success: true, data: systems, total: systems.length });
}));

router.get('/:systemId', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const system = await getAiSystem(req.tenantId, req.params.systemId);
  if (!system) { res.status(404).json({ success: false, error: 'AI system not found' }); return; }
  res.json({ success: true, data: system });
}));

router.post('/', authenticate, requirePermission('ai.governance.write'), validate({ body: registerBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await registerAiSystem(req.tenantId, { ...req.body, created_by: userId });
  setAuditData(res as any, { action: 'create', entityType: 'ai_system_registry', entityId: result.id, afterState: { system_code: result.system_code, risk_classification: req.body.risk_classification } });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: result.id, action: 'created', triggeredBy: userId, data: { system_code: result.system_code } });
  res.status(201).json({ success: true, data: result });
}));

router.post('/:systemId/classify', authenticate, requirePermission('ai.governance.write'), validate({ body: createClassifyBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const classification = await classifyRisk(req.tenantId, req.params.systemId);
  setAuditData(res as any, { action: 'classify', entityType: 'ai_system_registry', entityId: req.params.systemId, afterState: classification });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: req.params.systemId, action: 'updated', triggeredBy: userId, data: { action: 'classify', classification: classification.classification } });
  res.json({ success: true, data: classification });
}));

router.post('/:systemId/reassess', authenticate, requirePermission('ai.governance.write'), validate({ body: createReassessBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await triggerReassessment(req.tenantId, req.params.systemId, req.body?.reason || 'manual reassessment');
  setAuditData(res as any, { action: 'reassess', entityType: 'ai_system_registry', entityId: req.params.systemId });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: req.params.systemId, action: 'updated', triggeredBy: userId, data: { action: 'reassessment_triggered' } });
  res.json({ success: true, data: result });
}));

router.get('/:systemId/conformity', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getConformityStatus(req.tenantId);
  res.json({ success: true, data: result });
}));

router.post('/:systemId/go-no-go', authenticate, requirePermission('ai.governance.approve'), validate({ body: goNoGoBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await recordGoNoGoDecision(req.tenantId, req.params.systemId, req.body.decision, req.body.rationale, req.body.conditions);
  setAuditData(res as any, { action: 'go_no_go', entityType: 'ai_system_registry', entityId: req.params.systemId, afterState: { decision: req.body.decision } });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: req.params.systemId, action: 'approved', triggeredBy: userId, data: { decision: req.body.decision, rationale: req.body.rationale } });
  res.json({ success: true, data: result });
}));

router.post('/:systemId/decommission', authenticate, requirePermission('ai.governance.write'), validate({ body: createDecommissionBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const system = await getAiSystem(req.tenantId, req.params.systemId);
  if (system) {
    await enforceStatusTransition(req.tenantId, {
      moduleCode: 'ai-governance',
      entityId: req.params.systemId,
      toStatus: 'decommissioned',
      fromStatus: system.status || system.deployment_status,
      actorUserId: userId,
    });
  }
  const result = await decommissionSystem(req.tenantId, req.params.systemId, req.body?.reason || 'decommissioned');
  setAuditData(res as any, { action: 'decommission', entityType: 'ai_system_registry', entityId: req.params.systemId });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: req.params.systemId, action: 'status_changed', triggeredBy: userId, newState: 'archived' as any, data: { action: 'decommissioned' } });
  res.json({ success: true, data: result });
}));

router.get('/:systemId/audit-trail', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const trail = await getAuditTrail(req.tenantId, req.params.systemId);
  res.json({ success: true, data: trail, total: trail.length });
}));

export default router;

let genericPayloadSchema = z.record(z.unknown());
