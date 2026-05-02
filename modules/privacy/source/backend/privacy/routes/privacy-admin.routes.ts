import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../schemas/privacy.schemas';
import {

  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getDsrAnalytics, getBreachOverview, getConsentStatus,
} from '../controllers/privacy-admin.controller';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('privacy-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('privacy.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('privacy.record.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.get('/dsr-analytics', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getDsrAnalytics));

router.get('/breaches', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getBreachOverview));

router.get('/consent-status', requirePermission('privacy.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getConsentStatus));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

export default router;

