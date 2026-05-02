import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../../schemas/qiyas.schemas';
import {

  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getMaturityAnalytics, getBelowThreshold, getResponseRates,
} from '../controllers/qiyas-admin.controller';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('qiyas-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('qiyas.assessment.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('qiyas.assessment.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('qiyas.assessment.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.get('/maturity-analytics', requirePermission('qiyas.assessment.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getMaturityAnalytics));

router.get('/below-threshold', requirePermission('qiyas.assessment.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getBelowThreshold));

router.get('/response-rates', requirePermission('qiyas.assessment.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getResponseRates));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

export default router;

