import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';

const genericPayloadSchema = z.record(z.unknown());

import { validate, auditMiddleware, setAuditData as _setAuditData, asyncHandler, rateLimiter, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../../../schemas/compliance.schemas';
import {
  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getSlaConfig, getEscalationPolicy, getRunbookLinks,
} from '../../controllers/compliance-admin.controller';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));
router.use(authenticate);
router.use(auditMiddleware('compliance-admin'));
router.use(rateLimiter({ namespace: 'compliance-admin', windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', authenticate, requirePermission('compliance.program.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', authenticate, requirePermission('compliance.program.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', authenticate, requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.post('/reindex', authenticate, requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', authenticate, requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

router.get('/sla', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getSlaConfig));

router.get('/escalation-policy', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getEscalationPolicy));

router.get('/runbooks', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getRunbookLinks));

export default router;

