

import { Router, Response } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';

import { asyncHandler, moduleStack, auditMiddleware, scopeContext } from '../ports/middleware.port';
import { ok } from '@dos/module-sdk';
import { ExecutiveWidgetsService } from '../services/executive/executive-widgets.service';
import type { AuthenticatedRequest } from '@dos/types';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('widgets'));
router.use(auditMiddleware('widgets'));
router.use(scopeContext);

router.get('/summary',
  authenticate, requirePermission('widgets.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const service = new ExecutiveWidgetsService((tenantId as any));

    const result = await service.getSummary();
    res.json(ok(result, req));
  }),
);

router.get('/top-breached-kris',
  authenticate, requirePermission('widgets.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Number(req.query?.limit ?? 10);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const service = new ExecutiveWidgetsService((tenantId as any));
    const result = await service.getTopBreachedKris((limit as any));
    res.json(ok(result, req));
  }),
);

router.get('/policy-review-debt',
  authenticate, requirePermission('widgets.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Number(req.query?.limit ?? 10);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const service = new ExecutiveWidgetsService((tenantId as any));
    const result = await service.getPolicyReviewDebt((limit as any));
    res.json(ok(result, req));
  }),
);

router.get('/engine-trend',
  authenticate, requirePermission('widgets.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const tenantId = req.tenantId!;
    const limit = Number(req.query?.limit ?? 12);
    if (!tenantId) {
      return res.status(400).json({ message: 'tenantId is required' });
    }

    const service = new ExecutiveWidgetsService((tenantId as any));
    const result = await service.getEngineTrend((limit as any));
    res.json(ok(result, req));
  }),
);

export default router;
