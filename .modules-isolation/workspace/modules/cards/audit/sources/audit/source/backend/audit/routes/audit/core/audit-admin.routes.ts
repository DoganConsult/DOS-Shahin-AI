import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, rateLimiter } from '../../../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../../../schemas/audit.schemas';
import {

  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getAuditAnalytics, getOpenFindings,
} from '../../../controllers/audit-admin.controller';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('audit-admin'));
router.use(rateLimiter({ window: 60_000, limit: 30 }));

router.get('/config', requirePermission('audit.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig as any));
router.put('/config', requirePermission('audit.record.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig as any));
router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule as any));
router.get('/health', requirePermission('audit.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth as any));
router.get('/analytics', requirePermission('audit.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getAuditAnalytics as any));
router.get('/findings/open', requirePermission('audit.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getOpenFindings as any));
router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule as any));
router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule as any));

export default router;

