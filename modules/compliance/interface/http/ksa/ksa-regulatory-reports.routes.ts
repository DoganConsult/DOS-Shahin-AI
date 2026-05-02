import { emitEvent as _emitEvent } from '../../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// KSA Regulatory Reports Routes
// API endpoints for KSA regulatory report generation
// ============================================

import { Router } from 'express';
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getReportTemplates as _getReportTemplates,
  generateRegulatoryReport,
  getReportHistory as _getReportHistory,
} from '../../../ksa-regulatory/services/ksa-regulatory-report-templates.service';
import { computeKsaComplianceScore, computeKsaGapAnalysis } from '../../../infrastructure/integrations/ksa-regulatory/services/ksa-compliance-scoring.service';
import { validate, auditMiddleware, setAuditData, moduleStack, mutationEventHook } from '../../../ports/middleware.port';
import { createNcaBody, createSamaBody, createPdplBody } from '../../../schemas/compliance.schemas';

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(mutationEventHook('compliance'));

router.get(
  '/score',
  authenticate,
  requirePermission('compliance.score.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const frameworkCode = req.query.frameworkCode as string | undefined;
      const score = await computeKsaComplianceScore(tenantId, frameworkCode);
      res.json({ success: true, data: score });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.get(
  '/score/summary',
  authenticate,
  requirePermission('compliance.score.view'), validate({ query: z.record(z.unknown()) }), async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const frameworkCode = (req.query.frameworkCode as string) || 'NCA-ECC';
      const summary = await computeKsaGapAnalysis(tenantId, frameworkCode);
      res.json({ success: true, data: summary });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.post(
  '/reports/nca',
  authenticate,
  requirePermission('reports.document.generate'),
  validate({ body: createNcaBody }),
  async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { periodStart, periodEnd } = req.body;
      const report = await generateRegulatoryReport(tenantId, 'nca-ecc-self-assessment', { periodFrom: periodStart, periodTo: periodEnd });
      setAuditData(res as any, { action: 'generate', entityType: 'regulatory_report', entityId: 'nca-ecc', afterState: { templateCode: 'nca-ecc-self-assessment' } });
      res.json({ success: true, data: report });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.post(
  '/reports/sama',
  authenticate,
  requirePermission('reports.document.generate'),
  validate({ body: createSamaBody }),
  async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { periodStart, periodEnd } = req.body;
      const report = await generateRegulatoryReport(tenantId, 'sama-posture', { periodFrom: periodStart, periodTo: periodEnd });
      setAuditData(res as any, { action: 'generate', entityType: 'regulatory_report', entityId: 'sama', afterState: { templateCode: 'sama-posture' } });
      res.json({ success: true, data: report });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

router.post(
  '/reports/pdpl',
  authenticate,
  requirePermission('reports.document.generate'),
  validate({ body: createPdplBody }),
  async (req, res) => {
    try {
      const tenantId = req.tenantId!;
      const { periodStart, periodEnd } = req.body;
      const report = await generateRegulatoryReport(tenantId, 'pdpl-compliance', { periodFrom: periodStart, periodTo: periodEnd });
      setAuditData(res as any, { action: 'generate', entityType: 'regulatory_report', entityId: 'pdpl', afterState: { templateCode: 'pdpl-compliance' } });
      res.json({ success: true, data: report });
    } catch (err) {
      res.status(500).json({ success: false, error: (err as Error).message });
    }
  },
);

export default router;

