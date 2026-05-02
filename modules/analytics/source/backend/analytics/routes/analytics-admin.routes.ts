import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../schemas/analytics.schemas';
import {

  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getDashboardAnalytics, getWidgetHealth,
} from '../controllers/analytics-admin.controller';

const genericPayloadSchema = z.record(z.unknown());

type AnalyticsAdminHandler = (req: AuthenticatedRequest, res: Response) => Promise<void>;

function withAuthenticatedRequest(handler: AnalyticsAdminHandler) {
  return asyncHandler<AuthenticatedRequest>(async (req, res, _next) => handler(req, res));
}

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('analytics-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('analytics.report.configure'), validate({ query: z.record(z.unknown()) }), withAuthenticatedRequest(getModuleConfig));
router.put('/config', requirePermission('analytics.report.configure'), validate({ body: updateConfigBody }), withAuthenticatedRequest(updateModuleConfig));
router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), withAuthenticatedRequest(reseedModule));
router.get('/health', requirePermission('analytics.report.read'), validate({ query: z.record(z.unknown()) }), withAuthenticatedRequest(getModuleHealth));
router.get('/analytics', requirePermission('analytics.report.read'), validate({ query: z.record(z.unknown()) }), withAuthenticatedRequest(getDashboardAnalytics));
router.get('/widget-health', requirePermission('analytics.report.read'), validate({ query: z.record(z.unknown()) }), withAuthenticatedRequest(getWidgetHealth));
router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), withAuthenticatedRequest(reindexModule));
router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), withAuthenticatedRequest(backfillModule));

export default router;
