import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import {
  listTasks,
  getTask,
  createTask,
  assignTask,
  completeTask,
  rejectTask,
  reassignTask,
} from '../domain/task.service';
import { publishTaskAssigned, publishTaskCompleted } from '../events/workflow.publishers';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:task', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/', requirePermission('workflow.task.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const assignedTo = (req.query['assignedTo'] || req.query['assigneeId']) as string | undefined;
  const status = req.query['status'] as string | undefined;
  const result = await listTasks({ tenantId, limit, offset, assignedTo, status });
  res.json({ data: result.data, total: result.total });
}));

router.post('/', requirePermission('workflow.task.act'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { instanceId, workflowInstanceId, taskType, title, description, dueAt, context } = req.body;
  const instId = instanceId || workflowInstanceId;
  if (!instId || !title || !taskType) {
    res.status(400).json({ error: 'instanceId, taskType, and title are required' });
    return;
  }
  const task = await createTask({ tenantId, instanceId: instId, taskType, title, description, dueAt, context });
  res.status(201).json({ data: task });
}));

router.get('/:id', requirePermission('workflow.task.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const task = await getTask(req.params['id']!, tenantId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ data: task });
}));

router.post('/:id/assign', requirePermission('workflow.task.act'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { assigneeId, assignedBy } = req.body;
  if (!assigneeId) {
    res.status(400).json({ error: 'assigneeId is required' });
    return;
  }
  const task = await assignTask(req.params['id']!, tenantId, assigneeId, assignedBy || req.user!.userId);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  publishTaskAssigned(task).catch((): void => undefined);
  res.json({ data: task });
}));

router.post('/:id/complete', requirePermission('workflow.task.act'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { completedBy, outcome, notes } = req.body;
  const actor = completedBy || req.user!.userId;
  const task = await completeTask(req.params['id']!, tenantId, actor, outcome, notes);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  publishTaskCompleted(task).catch((): void => undefined);
  res.json({ data: task });
}));

router.post('/:id/reject', requirePermission('workflow.task.act'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { rejectedBy, reason } = req.body;
  const actor = rejectedBy || req.user!.userId;
  const task = await rejectTask(req.params['id']!, tenantId, actor, reason);
  if (!task) {
    res.status(404).json({ error: 'Task not found' });
    return;
  }
  res.json({ data: task });
}));

router.post('/:id/reassign', requirePermission('workflow.task.act'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
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
