import { emitEvent as _emitEvent } from './ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z as _z } from 'zod';
import { Router, Request, Response } from 'express';
import { PackPolicyService } from './pack-policy.service';
import { authenticate, requirePermission } from './ports/auth.port';
import { validate as _validate, auditMiddleware, asyncHandler, moduleStack } from './ports/middleware.port';

const router: import("express").Router = Router();
const service = new PackPolicyService();

router.use(moduleStack('packs'));
router.use(auditMiddleware('packs'));

router.post(
  '/policies/evaluate',
  authenticate,
  requirePermission('packs.policy.manage'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;
    const userId = req.user?.userId || req.user?.id;

    const sessionId = req.body?.sessionId;
    if (!sessionId) {
      res.status(400).json({ message: 'sessionId is required' });
      return;
    }

    const result = await service.evaluate({
      sessionId: String(sessionId),
      tenantId: String(tenantId),
      userId: String(userId),
    });

    res.json(result);
  }),
);

router.get(
  '/policies/decisions/:sessionId',
  authenticate,
  requirePermission('packs.policy.read'),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId;

    const result = await service.listDecisions(
      String(tenantId),
      String(req.params.sessionId),
    );

    res.json(result);
  }),
);

export default router;
