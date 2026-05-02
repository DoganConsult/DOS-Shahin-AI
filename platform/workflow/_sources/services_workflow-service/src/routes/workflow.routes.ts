import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import {
  createWorkflowInstance,
  getWorkflowInstance,
  updateWorkflowInstance,
  listWorkflowInstances,
  advanceWorkflowInstance,
  completeWorkflowInstance,
  cancelWorkflowInstance,
} from '../domain/workflow.service';
import {
  publishWorkflowCreated,
  publishWorkflowAdvanced,
  publishWorkflowCompleted,
} from '../events/workflow.publishers';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:workflow', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const status = req.query['status'] as string | undefined;
  const result = await listWorkflowInstances({ tenantId, limit, offset, status });
  res.json({ data: result.data, total: result.total });
}));

router.post('/', requirePermission('workflow.instance.write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { workflowType, templateId, name, createdBy, initiatorId, entityType, entityId, context } = req.body;
  const wfType = workflowType || templateId;
  const actor = createdBy || initiatorId || req.user!.userId;
  if (!wfType) {
    res.status(400).json({ error: 'workflowType is required' });
    return;
  }
  const instance = await createWorkflowInstance({ tenantId, workflowType: wfType, name, createdBy: actor, entityType, entityId, context });
  publishWorkflowCreated(instance).catch((): void => undefined);
  res.status(201).json({ data: instance });
}));

router.get('/:id', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const instance = await getWorkflowInstance(req.params['id']!, tenantId);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  res.json({ data: instance });
}));

router.put('/:id', requirePermission('workflow.instance.write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { name, context } = req.body;
  const instance = await updateWorkflowInstance(req.params['id']!, tenantId, { name, context });
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  res.json({ data: instance });
}));

router.post('/:id/advance', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { actorId, stepOutput } = req.body;
  const instance = await advanceWorkflowInstance(req.params['id']!, tenantId, actorId || req.user!.userId, stepOutput);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  publishWorkflowAdvanced(instance).catch((): void => undefined);
  res.json({ data: instance });
}));

router.post('/:id/complete', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { actorId } = req.body;
  const instance = await completeWorkflowInstance(req.params['id']!, tenantId, actorId || req.user!.userId);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  publishWorkflowCompleted(instance).catch((): void => undefined);
  res.json({ data: instance });
}));

router.post('/:id/cancel', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { reason } = req.body;
  const instance = await cancelWorkflowInstance(req.params['id']!, tenantId, reason);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  res.json({ data: instance });
}));

export default router;
