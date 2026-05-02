import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../schemas/action.schemas';
import {

  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getOverdueAnalytics, getAssigneeWorkload,
} from '../controllers/action-admin.controller';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('action-admin'));

router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('action.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('action.item.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('action.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.get('/overdue-analytics', requirePermission('action.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getOverdueAnalytics));

router.get('/assignee-workload', requirePermission('action.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getAssigneeWorkload));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

export default router;

