

import { Router, Response } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';

import { asyncHandler, moduleStack, auditMiddleware, scopeContext } from '../ports/middleware.port';
import { ok } from '@dos/module-sdk';
import { WidgetRuntimeService } from '../services/runtime/widget-runtime.service';
import { INSIGHT_WIDGET_KEYS as _INSIGHT_WIDGET_KEYS } from '../services/insight/insight-widgets.service';
import type { AuthenticatedRequest } from '@dos/types';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('widgets'));
router.use(auditMiddleware('widgets'));
router.use(scopeContext);

router.get('/catalog',
  authenticate, requirePermission('widgets.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRuntimeService(req.tenantId!);
    const widgets = await service.getPublishedCatalog();
    res.json(ok(widgets, req));
  }),
);

router.get('/bundles/published',
  authenticate, requirePermission('widgets.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRuntimeService(req.tenantId!);
    const bundles = await service.getPublishedBundles();
    res.json(ok(bundles, req));
  }),
);

router.get('/render/:widgetKey',
  authenticate, requirePermission('widgets.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const userId = req.user!.userId!;
    const tenantId = req.tenantId!;

    if (!userId || !tenantId) {
      return res.status(401).json({ message: 'Missing auth context' });
    }

    const widgetKey = String(req.params.widgetKey);
    const service = new WidgetRuntimeService(tenantId);

    const result = await service.renderWidget({
      widgetKey,
      userId: String(userId),
      tenantId: String(tenantId),
    });

    if (service.isInsightWidget(widgetKey)) {
      return res.json(result.payload);
    }

    return res.json(result);
  }),
);

router.get('/stats',
  authenticate, requirePermission('widgets.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetRuntimeService(req.tenantId!);
    const widgetKey = req.query.widgetKey as string | undefined;
    const stats = await service.getRenderStats(widgetKey);
    res.json(ok(stats, req));
  }),
);

export default router;
