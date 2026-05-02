

import { Router, Response } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../ports/auth.port';

import { asyncHandler, moduleStack, auditMiddleware } from '../ports/middleware.port';
import { ok } from '@dos/module-sdk';
import { WidgetDiagnosticsService } from '../diagnostics/widgets-diagnostics.service';
import type { AuthenticatedRequest } from '@dos/types';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('widgets'));
router.use(auditMiddleware('widgets'));

router.get('/health',
  authenticate, requirePermission('widgets.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetDiagnosticsService(req.tenantId!);
    const result = await service.runDiagnostics();
    res.json(ok(result, req));
  }),
);

router.get('/render',
  authenticate, requirePermission('widgets.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetDiagnosticsService(req.tenantId!);
    const checks = await service.runRenderDiagnostics();
    res.json(ok({ checks, checkedAt: new Date().toISOString() }, req));
  }),
);

router.get('/publication',
  authenticate, requirePermission('widgets.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const service = new WidgetDiagnosticsService(req.tenantId!);
    const checks = await service.runPublicationDiagnostics();
    res.json(ok({ checks, checkedAt: new Date().toISOString() }, req));
  }),
);

export default router;
