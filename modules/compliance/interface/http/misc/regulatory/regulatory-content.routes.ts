import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../../../ports/auth.port';
import {
  importRegulatoryFeed, getCrossRegulationMap,
  detectRegulatoryImpact, listRegulatoryAuthorities,
  logFrameworkChange, listPendingFrameworkChanges,
} from '../../../services/regulatory/regulatory-content.service';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData as _setAuditData, asyncHandler, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { importFeedBody, logFrameworkChangeBody } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

/**
 * @openapi
 * /regulatory-content/authorities:
 *   get:
 *     tags: [Regulatory]
 *     summary: List all regulatory authorities
 *     security: [{bearerAuth: []}]
 *     responses:
 *       200:
 *         description: List of regulatory authorities with framework counts
 */
router.get('/authorities', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), async (_req: Request, res: Response) => {
  const data = await listRegulatoryAuthorities();
  res.json({ data });
});

/**
 * @openapi
 * /regulatory-content/cross-map:
 *   get:
 *     tags: [Regulatory]
 *     summary: Get cross-regulation control mappings
 *     parameters:
 *       - name: frameworkA
 *         in: query
 *         required: true
 *         schema: { type: string }
 *       - name: frameworkB
 *         in: query
 *         required: true
 *         schema: { type: string }
 */
router.get('/cross-map', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { frameworkA, frameworkB } = req.query as Record<string, string>;
  if (!frameworkA || !frameworkB) return res.status(400).json({ error: 'frameworkA and frameworkB required' }) as unknown;
  const data = await getCrossRegulationMap(frameworkA, frameworkB);
  res.json({ data });
}));

/**
 * @openapi
 * /regulatory-content/impact:
 *   get:
 *     tags: [Regulatory]
 *     summary: Detect regulatory changes affecting tenant frameworks
 */
router.get('/impact', authenticate, requirePermission('compliance.program.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await detectRegulatoryImpact(tenantId);
  res.json({ data });
}));

/**
 * @openapi
 * /regulatory-content/import:
 *   post:
 *     tags: [Regulatory]
 *     summary: Import regulatory feed (UCF-compatible)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               feed:
 *                 type: array
 */
router.post('/import', authenticate, requirePermission('admin.system.write'), validate({ body: importFeedBody }), asyncHandler(async (req, res) => {
  const { feed } = req.body;
  if (!Array.isArray(feed)) return res.status(400).json({ error: 'feed must be array' }) as unknown;
  const result = await importRegulatoryFeed(feed);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'regulatory_content', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.regulatory_content.created' });
  res.json({ success: true, ...result });
}));

router.post('/framework-changes', authenticate, requirePermission('admin.system.write'), validate({ body: logFrameworkChangeBody }), asyncHandler(async (req, res) => {
  const result = await logFrameworkChange(req.body);
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'regulatory_content', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.regulatory_content.created' });
  res.status(201).json(result);
}));

router.get('/framework-changes/pending', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('compliance.program.read'), async (_req: Request, res: Response) => {
  const data = await listPendingFrameworkChanges();
  res.json({ data });
});

export default router;

