import { Router, Request, Response } from 'express';
import { z } from "zod";
import { asyncHandler } from '@dos/module-sdk';
import {

  createWorkflowInstance,
  getWorkflowInstance,
  updateWorkflowInstance,
  listWorkflowInstances,
  advanceWorkflowInstance,
  completeWorkflowInstance,
  cancelWorkflowInstance,
} from '../domain/workflow.service';

const genericPayloadSchema = z.record(z.unknown());
import {
  publishWorkflowCreated,
  publishWorkflowAdvanced,
  publishWorkflowCompleted,
} from '../events/bus/workflow.publishers';
import { validate } from "../ports/middleware.port";
const router = Router();

router.get('/', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const status = req.query['status'] as string | undefined;
  const result = await listWorkflowInstances({ tenantId, limit, offset, status });
  res.json({ data: result.data, total: result.total });
}));

router.post('/', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { workflowType, templateId, name, createdBy, initiatorId, entityType, entityId, context } = req.body;
  const wfType = workflowType || templateId;
  const actor = createdBy || initiatorId;
  if (!wfType || !actor) {
    res.status(400).json({ error: 'workflowType and createdBy are required' });
    return;
  }
  const instance = await createWorkflowInstance({ tenantId, workflowType: wfType, name, createdBy: actor, entityType, entityId, context });
  publishWorkflowCreated(instance).catch(() => undefined);
  res.status(201).json({ data: instance });
}));

router.get('/:id', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const instance = await getWorkflowInstance(req.params['id']!, tenantId);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  res.json({ data: instance });
}));

router.put('/:id', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { name, context } = req.body;
  const instance = await updateWorkflowInstance(req.params['id']!, tenantId, { name, context });
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  res.json({ data: instance });
}));

router.post('/:id/advance', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { actorId, stepOutput } = req.body;
  const instance = await advanceWorkflowInstance(req.params['id']!, tenantId, actorId, stepOutput);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  publishWorkflowAdvanced(instance).catch(() => undefined);
  res.json({ data: instance });
}));

router.post('/:id/complete', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { actorId } = req.body;
  const instance = await completeWorkflowInstance(req.params['id']!, tenantId, actorId);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  publishWorkflowCompleted(instance).catch(() => undefined);
  res.json({ data: instance });
}));

router.post('/:id/cancel', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { reason } = req.body;
  const instance = await cancelWorkflowInstance(req.params['id']!, tenantId, reason);
  if (!instance) {
    res.status(404).json({ error: 'Workflow instance not found' });
    return;
  }
  res.json({ data: instance });
}));

export default router;
