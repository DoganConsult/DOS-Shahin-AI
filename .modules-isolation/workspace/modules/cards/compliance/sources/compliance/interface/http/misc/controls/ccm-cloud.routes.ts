import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate } from '../../../../ports/auth.port';
import {
  pollAWSConfig, pollAzurePolicy, getCCMCloudSummary, addCCMCloudMapping,
} from '../../../services/ccm/ccm-cloud-monitor.service';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData as _setAuditData, asyncHandler, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { requirePermission } from "@dos/module-auth";
import { addMappingBody, pollCloudBody } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

/**
 * @openapi
 * /ccm-cloud/summary:
 *   get:
 *     tags: [CCM]
 *     summary: Get cloud compliance monitoring summary (last 24h)
 */
router.get('/summary', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getCCMCloudSummary(tenantId);
  res.json(data);
}));

/**
 * @openapi
 * /ccm-cloud/mappings:
 *   post:
 *     tags: [CCM]
 *     summary: Add cloud-to-control mapping
 */
router.post('/mappings', authenticate, requirePermission('compliance.program.manage'), validate({ body: addMappingBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await addCCMCloudMapping(tenantId, req.body);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'controls', event: 'created', entityType: 'ccm_cloud', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.ccm_cloud.created' });
  res.status(201).json({ success: true });
}));

/**
 * @openapi
 * /ccm-cloud/poll/aws:
 *   post:
 *     tags: [CCM]
 *     summary: Poll AWS Config compliance for all mapped controls
 */
router.post('/poll/aws', authenticate, requirePermission('compliance.program.manage'), validate({ body: pollCloudBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const results = await pollAWSConfig(tenantId, req.body);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'controls', event: 'created', entityType: 'ccm_cloud', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.ccm_cloud.created' });
  res.json({ results, count: results.length });
}));

/**
 * @openapi
 * /ccm-cloud/poll/azure:
 *   post:
 *     tags: [CCM]
 *     summary: Poll Azure Policy compliance for all mapped controls
 */
router.post('/poll/azure', authenticate, requirePermission('compliance.program.manage'), validate({ body: pollCloudBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const results = await pollAzurePolicy(tenantId, req.body);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'controls', event: 'created', entityType: 'ccm_cloud', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:controls.ccm_cloud.created' });
  res.json({ results, count: results.length });
}));

export default router;

