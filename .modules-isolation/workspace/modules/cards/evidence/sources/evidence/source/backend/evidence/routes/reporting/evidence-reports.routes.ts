import { Request, Response, Router } from 'express';
import { z } from "zod";
// ============================================
// Evidence Reports Routes
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { errMsg } from '../../../../i18n/error-messages';
import { validate } from "../ports/middleware.port";
const router = Router();

// GET /api/evidence/reports/aging
router.get('/aging', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateAgingReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateAgingReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/overdue-requests — dedicated overdue requests report
router.get('/overdue-requests', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateOverdueRequestsReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateOverdueRequestsReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/review-backlog — dedicated review backlog report
router.get('/review-backlog', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateReviewBacklogReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateReviewBacklogReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/reuse
router.get('/reuse', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateReuseReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateReuseReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/source-coverage
router.get('/source-coverage', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateSourceCoverageReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateSourceCoverageReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/audit-readiness — framework-level coverage and freshness breakdown
router.get('/audit-readiness', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateAuditReadinessReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateAuditReadinessReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/stale — stale evidence by framework and owner
router.get('/stale', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateStaleEvidenceReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateStaleEvidenceReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/quality
router.get('/quality', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateQualityReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateQualityReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// GET /api/evidence/reports/freshness
router.get('/freshness', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('evidence.item.read'), async (req: Request, res: Response) => {
  try {
    const { generateFreshnessReport } = await import('../../services/reporting/evidence-reporting.service.js');
    const report = await generateFreshnessReport(req.user!.tenantId!);
    res.json(report);
  } catch (_err: unknown) {
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;
