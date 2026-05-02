import { Router, Request, Response } from 'express';
import { z } from "zod";
import { asyncHandler } from '@dos/module-sdk';
import {

  listTasks,
  getTask,
  createTask,
  assignTask,
  completeTask,
  rejectTask,
  reassignTask,
} from '../domain/task.service';

const genericPayloadSchema = z.record(z.unknown());
import { publishTaskAssigned, publishTaskCompleted } from '../events/bus/workflow.publishers';
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
  const assignedTo = (req.query['assignedTo'] || req.query['assigneeId']) as string | undefined;
  const status = req.query['status'] as string | undefined;
  const result = await listTasks({ tenantId, limit, offset, assignedTo, status });
  res.json({ data: result.data, total: result.total });
}));

router.post('/', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { instanceId, workflowInstanceId, taskType, title, description, dueAt, context } = req.body;
  const instId = instanceId || workflowInstanceId;
  if (!instId || !title || !taskType) {
    res.status(400).json({ error: 'instanceId, taskType, and title are required' });
    return;
  }
  const task = await createTask({ tenantId, instanceId: instId, taskType, title, description, dueAt, context });
  res.status(201).json({ data: task });
}));

router.get('/:id', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const task = await getTask(req.params['id']!, tenantId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ data: task });
}));

router.post('/:id/assign', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { assigneeId, assignedBy } = req.body;
  if (!assigneeId) {
    res.status(400).json({ error: 'assigneeId is required' });
    return;
  }
  const task = await assignTask(req.params['id']!, tenantId, assigneeId, assignedBy);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  publishTaskAssigned(task).catch(() => undefined);
  res.json({ data: task });
}));

router.post('/:id/complete', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { completedBy, outcome, notes } = req.body;
  if (!completedBy) {
    res.status(400).json({ error: 'completedBy is required' });
    return;
  }
  const task = await completeTask(req.params['id']!, tenantId, completedBy, outcome, notes);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  publishTaskCompleted(task).catch(() => undefined);
  res.json({ data: task });
}));

router.post('/:id/reject', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { rejectedBy, reason } = req.body;
  if (!rejectedBy) {
    res.status(400).json({ error: 'rejectedBy is required' });
    return;
  }
  const task = await rejectTask(req.params['id']!, tenantId, rejectedBy, reason);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ data: task });
}));

router.post('/:id/reassign', validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    res.status(400).json({ error: 'x-tenant-id header required' });
    return;
  }
  const { fromUserId, toUserId, reason } = req.body;
  if (!toUserId) {
    res.status(400).json({ error: 'toUserId is required' });
    return;
  }
  const task = await reassignTask(req.params['id']!, tenantId, fromUserId, toUserId, reason);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ data: task });
}));

export default router;
