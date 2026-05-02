import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../ports/middleware.port';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody, createSlaEscalationBody, createEscalationChainBody } from '../schemas/issues.schemas';
import {

  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getIssuesAnalytics, getSeverityBreakdown, getCategoryBreakdown,
  getWorkloadDistribution, getManagementAlerts,
  triggerSlaEscalation, triggerEscalationChain,
} from '../controllers/issues-admin.controller';

const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('issues-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('issues.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('issues.record.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('issues.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

router.get('/analytics', requirePermission('issues.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getIssuesAnalytics));

router.get('/analytics/severity', requirePermission('issues.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getSeverityBreakdown));

router.get('/analytics/categories', requirePermission('issues.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getCategoryBreakdown));

router.get('/analytics/workload', requirePermission('issues.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getWorkloadDistribution));

router.get('/alerts', requirePermission('issues.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getManagementAlerts));

router.post('/maintenance/sla-escalation', requirePermission('admin.system.manage'), validate({ body: createSlaEscalationBody }), asyncHandler(triggerSlaEscalation));

router.post('/maintenance/escalation-chain', requirePermission('admin.system.manage'), validate({ body: createEscalationChainBody }), asyncHandler(triggerEscalationChain));

export default router;

