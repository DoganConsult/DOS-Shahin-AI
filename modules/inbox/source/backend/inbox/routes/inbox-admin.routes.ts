import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createPurgeExpiredBody, createRecalcPrioritiesBody, createEscalateOverdueBody, createRoutingRulesBody } from '../schemas/inbox.schemas';
import {

  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule,
  getQueueAnalytics, getReadRateMetrics, getResponseTimeMetrics,
  purgeExpiredMessages, recalcPriorities, escalateOverdue,
  listRoutingRules, addRoutingRule, removeRoutingRule,
  getBroadcasts, getDigestStats,
} from '../controllers/inbox-admin.controller';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('inbox-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('inbox.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('inbox.item.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.get('/analytics/queue', requirePermission('inbox.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getQueueAnalytics));

router.get('/analytics/read-rate', requirePermission('inbox.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getReadRateMetrics));

router.get('/analytics/response-time', requirePermission('inbox.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getResponseTimeMetrics));

router.post('/maintenance/purge-expired', requirePermission('admin.system.manage'), validate({ body: createPurgeExpiredBody }), asyncHandler(purgeExpiredMessages));

router.post('/maintenance/recalc-priorities', requirePermission('admin.system.manage'), validate({ body: createRecalcPrioritiesBody }), asyncHandler(recalcPriorities));

router.post('/maintenance/escalate-overdue', requirePermission('admin.system.manage'), validate({ body: createEscalateOverdueBody }), asyncHandler(escalateOverdue));

router.get('/routing-rules', requirePermission('inbox.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(listRoutingRules));

router.post('/routing-rules', requirePermission('inbox.item.configure'), validate({ body: createRoutingRulesBody }), asyncHandler(addRoutingRule));

router.delete('/routing-rules/:ruleId', requirePermission('inbox.item.configure'), validate({ body: genericPayloadSchema }), asyncHandler(removeRoutingRule));

router.get('/broadcasts', requirePermission('inbox.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getBroadcasts));

router.get('/digests/stats', requirePermission('inbox.item.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getDigestStats));

export default router;

