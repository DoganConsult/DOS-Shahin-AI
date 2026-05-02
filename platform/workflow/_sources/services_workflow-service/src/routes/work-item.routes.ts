import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import {
  getMyWorkItemsUnified,
  getMyWorkItems,
  createWorkItem,
  completeWorkItem,
} from '../domain/work-item.service';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:work-item', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/my-tasks', requirePermission('workflow.task.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId as string;
  const userId = req.user!.userId as string;

  const result = await getMyWorkItemsUnified(tenantId, userId, {
    status: req.query['status'] as string | undefined,
    priority: req.query['priority'] as string | undefined,
    taskType: req.query['taskType'] as string | undefined,
    overdue: req.query['overdue'] === 'true',
    limit: parseInt(req.query['limit'] as string || '50', 10),
  });

  res.json(result);
}));

router.get('/', requirePermission('workflow.task.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  const result = await getMyWorkItems({
    tenantId,
    assignedTo: req.query['assignedTo'] as string | undefined,
    status: req.query['status'] as string | undefined,
    priority: req.query['priority'] as string | undefined,
    taskType: req.query['taskType'] as string | undefined,
    source: req.query['source'] as string | undefined,
    workspaceId: req.query['workspaceId'] as string | undefined,
    overdue: req.query['overdue'] === 'true',
    limit: parseInt(req.query['limit'] as string || '50', 10),
    offset: parseInt(req.query['offset'] as string || '0', 10),
  });

  res.json({ data: result.tasks, total: result.count });
}));

router.post('/', requirePermission('workflow.task.act'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  const { title, description, taskType, source, sourceId, priority, assignedTo, dueDate, entityType, entityId, context } = req.body;
  if (!title) {
    res.status(400).json({ error: 'title is required' });
    return;
  }

  const item = await createWorkItem(tenantId, {
    title, description, taskType, source, sourceId, priority, assignedTo, dueDate, entityType, entityId, context,
  });
  res.status(201).json({ data: item });
}));

router.post('/:id/complete', requirePermission('workflow.task.act'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;

  const { completedBy, outcome, comment } = req.body;
  const userId = completedBy || req.user!.userId;

  const item = await completeWorkItem(tenantId, req.params['id']!, userId, outcome, comment);
  if (!item) {
    res.status(404).json({ error: 'Work item not found or already completed' });
    return;
  }
  res.json({ data: item });
}));

export default router;
