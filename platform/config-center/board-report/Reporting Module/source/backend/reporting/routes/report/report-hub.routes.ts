import { Request, Response, Router } from 'express';
import { z } from "zod";
import { z as _zHoist } from 'zod';
import { catchHandler, EC } from '@dos/platform-core/resilience';

// Phase 11 (M5): hoist genericPayloadSchema declaration above first use
// to avoid TDZ "Cannot access ... before initialization" during module
// load. Original `let` at end-of-file left the identifier unreachable
// when any handler referenced it during router setup.
const genericPayloadSchema = _zHoist.record(_zHoist.unknown());
/**
 * Report Hub API Routes
 *
 * 10 endpoints for the centralized report hub with AI analytics,
 * sharing, and granular RBAC.
 *
 * Requirements: 5.1, 5.2, 5.3
 */


import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  getReportCatalog,
  getExecutiveSummary,
  getReportDetail,
  exportReportPDF,
  exportReportExcel,
  getFrameworkCards,
  emailReportToAddresses,
} from '../../services/report/report-hub.service';
import { computeTrends, detectAnomalies } from '../../../ai/services/observability/ai-analytics.service';
import {
  shareReport,
  getSharesForReport,
  revokeShare,
} from '../../services/report/report-sharing.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, rateLimiter, validate, moduleStack } from '../../ports/middleware.port';
import { createReportIdEmailBody, createReportIdShareBody } from "../../schemas/reporting.schemas";

const router = Router();
router.use(moduleStack('reporting'));

const emailReportLimiter = rateLimiter({
  windowMs: 3600000, // 1 hour
  maxRequests: 10,
  namespace: 'report-email',
  keyGenerator: (req) => req.user?.userId ?? req.ip ?? 'anon',
});
router.use(auditMiddleware("reporting"));
router.use(automationMiddleware("reporting"));

function getTenantUser(req: Request): { tenantId: string; userId: string } {
  const user = req.user!;
  return { tenantId: user.tenantId, userId: user.userId };
}

// GET /api/report-hub/catalog — List reports with filtering and pagination
router.get('/catalog', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantUser(req);
  const filters = {
    module: req.query.module as any,
    dateFrom: req.query.dateFrom as string | undefined,
    dateTo: req.query.dateTo as string | undefined,
    search: req.query.search as string | undefined,
    sharedWithMe: req.query.sharedWithMe === 'true',
    cursor: req.query.cursor as string | undefined,
    pageSize: req.query.pageSize ? parseInt(req.query.pageSize as string, 10) : undefined,
  };
  const page = await getReportCatalog(tenantId, userId, filters);
  res.json(page);
});

// GET /api/report-hub/summary — Executive summary with KPIs
router.get('/summary', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const { tenantId } = getTenantUser(req);
  const summary = await getExecutiveSummary(tenantId);
  res.json(summary);
});

// GET /api/report-hub/trends — AI trend analysis
router.get('/trends', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const { tenantId } = getTenantUser(req);
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
  const trends = await computeTrends(tenantId, days);
  res.json({ trends });
});

// GET /api/report-hub/anomalies — Anomaly detection
router.get('/anomalies', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const { tenantId } = getTenantUser(req);
  const anomalies = await detectAnomalies(tenantId);
  res.json({ anomalies });
});

// GET /api/report-hub/framework-cards — Framework report cards for Report Hub grid
router.get('/framework-cards', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const { tenantId } = getTenantUser(req);
  const cards = await getFrameworkCards(tenantId);
  res.json(cards);
});

// GET /api/report-hub/:reportId — Report detail with AI summary
router.get('/:reportId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUser(req);
    const { reportId } = req.params;
    const language = (req.query.lang as 'en' | 'ar') || 'en';
    const detail = await getReportDetail(tenantId, reportId, language);
    res.json(detail);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Report not found') {
      res.status(404).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/report-hub/:reportId/pdf — Export report as PDF
router.get('/:reportId/pdf', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.download'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUser(req);
    const { reportId } = req.params;
    const language = (req.query.lang as string) || 'en';
    const buffer = await exportReportPDF(tenantId, reportId, language);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.pdf"`);
    res.send(buffer);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Report not found') {
      res.status(404).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/report-hub/:reportId/xls — Export report as Excel
router.get('/:reportId/xls', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.download'), async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUser(req);
    const { reportId } = req.params;
    const buffer = await exportReportExcel(tenantId, reportId);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="report-${reportId}.xlsx"`);
    res.send(buffer);
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Report not found') {
      res.status(404).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/report-hub/:reportId/email — Email report to external addresses (link or attach PDF)
router.post('/:reportId/email', authenticate, requirePermission('report.document.share'), validate({ body: createReportIdEmailBody }), emailReportLimiter, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getTenantUser(req);
    const { reportId } = req.params;
    const { to, subject, message, attachPdf } = req.body;
    if (!to || !Array.isArray(to) || to.length === 0) {
      res.status(400).json({ error: 'to array is required and must not be empty' });
      return;
    }
    const result = await emailReportToAddresses(tenantId, reportId, {
      to,
      subject,
      message,
      attachPdf: Boolean(attachPdf),
    });
    if (!result.sent) {
      res.status(400).json({ error: result.error || 'Failed to send email' });
      return;
    }
    setAuditData(res as any, { action: 'email', entityType: 'report', entityId: reportId, afterState: { to, attachPdf: Boolean(attachPdf) } });
    emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report', entityId: reportId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ sent: true });
  } catch (err: unknown) {
    if (toErrorMessage(err) === 'Report not found') {
      res.status(404).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/report-hub/:reportId/share — Share a report
router.post('/:reportId/share', authenticate, requirePermission('report.document.share'), validate({ body: createReportIdShareBody }), async (req: Request, res: Response) => {
  const { tenantId, userId } = getTenantUser(req);
  const { reportId } = req.params;
  const { recipientIds, recipientType } = req.body;
  if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
    res.status(400).json({ error: 'recipientIds array is required' });
    return;
  }
  const shares = await shareReport(tenantId, {
    reportId,
    sharedBy: userId,
    recipientIds,
    recipientType: recipientType || 'user',
  });
  setAuditData(res as any, { action: "create", entityType: "report", entityId: reportId, afterState: { shares, count: shares.length } });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report_share', entityId: reportId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ shares, count: shares.length });
});

// GET /api/report-hub/:reportId/shares — List shares for a report
router.get('/:reportId/shares', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('report.document.read'), async (req: Request, res: Response) => {
  const { tenantId } = getTenantUser(req);
  const { reportId } = req.params;
  const shares = await getSharesForReport(tenantId, reportId);
  res.json({ shares, count: shares.length });
});

// DELETE /api/report-hub/shares/:shareId — Revoke a share
router.delete('/shares/:shareId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('report.document.share'), async (req: Request, res: Response) => {
  const { tenantId } = getTenantUser(req);
  const { shareId } = req.params;
  await revokeShare(tenantId, shareId);
  setAuditData(res as any, { action: "delete", entityType: "report", entityId: shareId, afterState: { revoked: true, shareId } });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'deleted', entityType: 'report_share', entityId: shareId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ revoked: true, shareId });
});

export default router;

// genericPayloadSchema hoisted at top of file (Phase 11 TDZ fix).
