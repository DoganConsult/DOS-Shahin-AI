import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../ports/auth.port';
import { generateBoardReport, getAvailableBoardTemplates } from '../../services/misc/board-report-template.service';
import { generatePptxBoardPack } from '../../services/misc/pptx-board-pack.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { createGenerateBody, createGeneratepptxBody } from "../../schemas/reporting.schemas";

const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware("reporting"));
router.use(automationMiddleware("reporting"));

/**
 * @openapi
 * /board-reports/templates:
 *   get:
 *     tags: [Board Reports]
 *     summary: List available board report templates
 *     responses:
 *       200:
 *         description: Templates (nca_quarterly, iso27001_mgmt_review, board_risk_overview, audit_committee)
 */
router.get('/templates', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), (_req: Request, res: Response) => {
  res.json({ data: getAvailableBoardTemplates() });
});

/**
 * @openapi
 * /board-reports/generate:
 *   post:
 *     tags: [Board Reports]
 *     summary: Generate a board report from a template
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateCode, period]
 *             properties:
 *               templateCode:
 *                 type: string
 *                 enum: [nca_quarterly, iso27001_mgmt_review, board_risk_overview, audit_committee]
 *               period:
 *                 type: string
 *                 example: 'Q1 2026'
 */
router.post('/generate', authenticate, requirePermission('report.document.write'), validate({ body: createGenerateBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { templateCode, period } = req.body;
  if (!templateCode || !period) return res.status(400).json({ error: 'templateCode and period required' }) as unknown;
  const report = await generateBoardReport(tenantId, templateCode, period);
  setAuditData(res as any, { action: 'create', entityType: 'board_report', entityId: report.reportId || templateCode, afterState: report });
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'board_report', entityId: report.reportId || templateCode } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(report);
}));

/**
 * @openapi
 * /board-reports/generate-pptx:
 *   post:
 *     tags: [Board Reports]
 *     summary: Generate a PowerPoint board pack (.pptx)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [templateCode, period]
 *             properties:
 *               templateCode:
 *                 type: string
 *               period:
 *                 type: string
 *     responses:
 *       200:
 *         description: PowerPoint file (.pptx)
 *         content:
 *           application/vnd.openxmlformats-officedocument.presentationml.presentation:
 *             schema:
 *               type: string
 *               format: binary
 */
router.post('/generate-pptx', authenticate, requirePermission('report.document.write'), validate({ body: createGeneratepptxBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const { templateCode, period } = req.body;
  if (!templateCode || !period) {
  res.status(400).json({ error: 'templateCode and period required' }); return;
  }
  const buffer = await generatePptxBoardPack(tenantId, templateCode, period);
  const filename = `board-pack-${templateCode}-${period.replace(/\s+/g, '-')}.pptx`;
  setAuditData(res as any, { action: 'create', entityType: 'board_report', entityId: templateCode, afterState: { templateCode, period, format: 'pptx' } });
  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'board_report', entityId: templateCode } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}));

export default router;

