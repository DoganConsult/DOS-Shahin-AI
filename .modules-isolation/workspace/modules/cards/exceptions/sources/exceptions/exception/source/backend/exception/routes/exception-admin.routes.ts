import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, auditMiddleware, asyncHandler, rateLimiter } from '../ports/middleware.port';
import { ok } from '@dos/module-sdk';
import { safeQuery, tenantSchema } from '../ports/database.port';
import {
  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getExpiryOverview, getRiskBreakdown,
} from '../controllers/exception-admin.controller';
import { ExceptionAdminService } from '../services/exception-admin.service';
import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody } from '../schemas/exception.schemas';

const router = Router();
const adminService = new ExceptionAdminService();

router.use(authenticate);
router.use(auditMiddleware('exception-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/overview', requirePermission('exception.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getAdminOverview(req.tenantId!);
  res.json(ok(result, req));
}));

router.get('/stats', requirePermission('exception.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await adminService.getModuleStats(req.tenantId!);
  res.json(ok(result, req));
}));

router.get('/settings', requirePermission('exception.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const { rows } = await safeQuery(
    `SELECT key, value FROM "${schema}".module_settings WHERE module_code = $1`,
    ['exception'],
  ).catch(() => ({ rows: [] }));
  res.json(ok({ settings: rows }, req));
}));

router.get('/config', requirePermission('exception.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('exception.record.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('exception.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.get('/expiry-overview', requirePermission('exception.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getExpiryOverview));

router.get('/risk-breakdown', requirePermission('exception.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getRiskBreakdown));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

export default router;

