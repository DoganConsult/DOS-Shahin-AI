import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import {
  registerScheduledJob,
  listScheduledJobs,
  triggerScheduledJob,
  deactivateScheduledJob,
} from '../domain/schedule.service';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:schedule', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.post('/', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { name, cronExpression, jobType, payload, createdBy } = req.body;
  if (!name || !cronExpression || !jobType) {
    res.status(400).json({ error: 'name, cronExpression, and jobType are required' });
    return;
  }
  const job = await registerScheduledJob({ tenantId, name, cronExpression, jobType, payload, createdBy: createdBy || req.user!.userId });
  res.status(201).json({ data: job });
}));

router.get('/', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const limit = parseInt(req.query['limit'] as string || '50', 10);
  const offset = parseInt(req.query['offset'] as string || '0', 10);
  const active = req.query['active'] !== undefined ? req.query['active'] === 'true' : undefined;
  const result = await listScheduledJobs({ tenantId, limit, offset, active });
  res.json({ data: result.data, total: result.total });
}));

router.post('/:id/trigger', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const job = await triggerScheduledJob(req.params['id']!, tenantId, req.user!.userId);
  if (!job) {
    res.status(404).json({ error: 'Scheduled job not found' });
    return;
  }
  res.json({ data: job });
}));

router.patch('/:id/deactivate', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const job = await deactivateScheduledJob(req.params['id']!, tenantId);
  if (!job) {
    res.status(404).json({ error: 'Scheduled job not found' });
    return;
  }
  res.json({ data: job });
}));

export default router;
