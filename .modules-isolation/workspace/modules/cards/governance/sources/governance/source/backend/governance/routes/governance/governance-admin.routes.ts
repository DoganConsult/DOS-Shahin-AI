import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';

const genericPayloadSchema = z.record(z.unknown());

import { validate, auditMiddleware, asyncHandler, rateLimiter, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../../schemas/governance.schemas';
import {
  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
} from '../../controllers/governance-admin.controller';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance'));
router.use(mutationEventHook('governance'));
router.use(authenticate);
router.use(auditMiddleware('governance-admin'));
router.use(rateLimiter({ namespace: 'governance-admin', windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('governance.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('governance.record.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

export default router;

