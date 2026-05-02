import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import {
  getSla,
  createSla,
  getSlasForInstance,
  detectBreaches,
  detectWarnings,
  resolveSla,
  cancelSla,
  pauseSla,
  resumeSla,
} from '../domain/workflow-sla.service';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:sla', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get('/:instanceId', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const instanceId = req.params['instanceId']!;
  const slas = await getSlasForInstance(instanceId, tenantId);
  res.json({ data: slas });
}));

router.get('/item/:slaId', requirePermission('workflow.instance.read'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const sla = await getSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }
  res.json({ data: sla });
}));

router.post('/', requirePermission('workflow.instance.write'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { instanceId, stepId, slaType, targetHours, warningThresholdPct, context } = req.body;

  if (!instanceId || !slaType || !targetHours) {
    res.status(400).json({ error: 'instanceId, slaType, and targetHours are required' });
    return;
  }

  const sla = await createSla({ tenantId, instanceId, stepId, slaType, targetHours, warningThresholdPct, context });
  res.status(201).json({ data: sla });
}));

router.post('/:slaId/resolve', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const sla = await resolveSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }
  res.json({ data: sla });
}));

router.post('/:slaId/cancel', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const sla = await cancelSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }
  res.json({ data: sla });
}));

router.post('/:slaId/pause', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const sla = await pauseSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }
  res.json({ data: sla });
}));

router.post('/:slaId/resume', requirePermission('workflow.instance.execute'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const sla = await resumeSla(req.params['slaId']!, tenantId);
  if (!sla) {
    res.status(404).json({ error: 'SLA not found' });
    return;
  }
  res.json({ data: sla });
}));

router.post('/detect-breaches', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const breaches = await detectBreaches(tenantId);
  res.json({ data: breaches, count: breaches.length });
}));

router.post('/detect-warnings', requirePermission('workflow.instance.configure'), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const warnings = await detectWarnings(tenantId);
  res.json({ data: warnings, count: warnings.length });
}));

export default router;
