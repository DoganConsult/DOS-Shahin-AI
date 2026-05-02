import { Request, Response, NextFunction as _NextFunction, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, rateLimiter, moduleStack } from '../ports/middleware.port';

import { updateConfigBody, createReseedBody, createReindexBody, createBackfillBody, createAssessmentBody } from '../schemas/vendor.schemas';
import {
  getModuleConfig, updateModuleConfig, reseedModule,
  getModuleHealth, reindexModule, backfillModule,
  getVendorAnalytics, getHighRiskVendors,
} from '../controllers/vendor-admin.controller';

const router = Router();
router.use(moduleStack('vendor'));
router.use(authenticate);
router.use(auditMiddleware('vendor-admin'));
router.use(rateLimiter({ windowMs: 60_000, maxRequests: 30, keyGenerator: (req: any) => req.ip || 'unknown' }));

router.get('/config', requirePermission('vendor.record.configure'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleConfig));

router.put('/config', requirePermission('vendor.record.configure'), validate({ body: updateConfigBody }), asyncHandler(updateModuleConfig));

router.post('/reseed', requirePermission('admin.system.manage'), validate({ body: createReseedBody }), asyncHandler(reseedModule));

router.get('/health', requirePermission('vendor.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getModuleHealth));

router.get('/analytics', requirePermission('vendor.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getVendorAnalytics));

router.get('/high-risk', requirePermission('vendor.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getHighRiskVendors));

router.post('/reindex', requirePermission('admin.system.manage'), validate({ body: createReindexBody }), asyncHandler(reindexModule));

router.post('/backfill', requirePermission('admin.system.manage'), validate({ body: createBackfillBody }), asyncHandler(backfillModule));

router.get('/config/:key', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('vendor.record.read'), async (req: Request, res: Response) => {
  const { getConfig } = await import('../services/vendor/vendor-admin.service.js');
  const config = await getConfig(req.tenantId!, req.params.key);
  if (!config) return res.status(404).json({ error: 'Config key not found' });
  res.json(config);
});

router.put('/config/:key', authenticate, requirePermission('vendor.record.manage'), validate({ body: updateConfigBody }), async (req: Request, res: Response) => {
  const { updateConfig } = await import('../services/vendor/vendor-admin.service.js');
  const config = await updateConfig(req.tenantId!, req.params.key, req.body.value, req.userId!);
  setAuditData(res as any, { action: 'update', entityType: 'vendor_admin_config', entityId: req.params.key, afterState: config });
  res.json(config);
});

router.get('/templates/assessment', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('vendor.record.read'), async (req: Request, res: Response) => {
  const { getAssessmentTemplates } = await import('../services/vendor/vendor-admin.service.js');
  res.json(await getAssessmentTemplates(req.tenantId!));
});

router.post('/templates/assessment', authenticate, requirePermission('vendor.record.manage'), validate({ body: createAssessmentBody }), async (req: Request, res: Response) => {
  const { createAssessmentTemplate } = await import('../services/vendor/vendor-admin.service.js');
  const template = await createAssessmentTemplate(req.tenantId!, req.body, req.userId!);
  setAuditData(res as any, { action: 'create', entityType: 'vendor_assessment_template', entityId: template?.template_id, afterState: template });
  res.status(201).json(template);
});

router.get('/templates/dd-workflow', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('vendor.record.read'), async (req: Request, res: Response) => {
  const { getDDWorkflowTemplates } = await import('../services/vendor/vendor-admin.service.js');
  res.json(await getDDWorkflowTemplates(req.tenantId!));
});

export default router;

