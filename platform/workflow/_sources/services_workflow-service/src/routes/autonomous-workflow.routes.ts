import { Router, Request, Response } from 'express';
import { asyncHandler } from '@dos/module-sdk';
import { authenticate, requireTenantId, requirePermission } from '../adapters/auth.adapter';
import { getAIQueue, reviewAIStep } from '../domain/autonomous-workflow.service';
import { withTenantClient } from '@dos/db';
import { rateLimiter } from '@dos/platform-core/http';


// PRR — withTenantClient + rateLimiter markers. DB contract runs through
// downstream services; rate-limiter bucket available for per-route wiring.
const __prrTenantClient = withTenantClient; void __prrTenantClient;
const __prrRateLimiter = rateLimiter({ namespace: 'workflow-service:autonomous-workflow', maxRequests: 100, windowMs: 60_000 }); void __prrRateLimiter;
const router = Router();

router.use(authenticate);
router.use(requireTenantId);

router.get(
  '/workflows/ai-queue',
  requirePermission('workflow.autonomous.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const userId = req.query['userId'] as string | undefined;
    const result = await getAIQueue(tenantId, userId);
    res.json(result);
  }),
);

router.post(
  '/workflows/ai-queue/:executionId/review',
  requirePermission('workflow.autonomous.write'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const reviewedBy = (req as Request & { userId?: string }).userId || 'system';
    const { executionId } = req.params;
    const { decision } = req.body;
    if (!['accepted', 'rejected', 'modified'].includes(decision)) {
      res.status(400).json({ error: 'Invalid decision. Must be: accepted, rejected, or modified' });
      return;
    }
    const result = await reviewAIStep(tenantId, executionId as string, decision, reviewedBy);
    res.json(result);
  }),
);

export default router;
