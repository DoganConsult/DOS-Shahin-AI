import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Report Extension Routes
// Templates, generation, scheduling, maturity
// scorecards, evidence pack export, board views
// Requirements: 13.1, 13.2, 13.3, 13.4, 13.7, 13.8
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import {
  getReportTemplates,
  generateReport,
  scheduleReport,
  getMaturityScorecard,
  exportEvidencePack,
  getBoardView,
} from '../../services/report/report-ext.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { createGenerateBody, createScheduleBody, createEvidencepackexportBody } from "../../schemas/reporting.schemas";

const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware("reporting"));
router.use(automationMiddleware("reporting"));

// GET /api/report-ext/templates — List all report templates
router.get("/templates", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (_req: Request, res: Response) => {
  const templates = getReportTemplates();
  res.json({ templates, count: templates.length });
});

// POST /api/report-ext/generate — Generate a report
router.post("/generate", authenticate, requirePermission("report.document.write"), validate({ body: createGenerateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { templateId, filters } = req.body;
    if (!templateId) {
      res.status(400).json({ error: "templateId is required" });
      return;
    }
    const report = await generateReport(tenantId, templateId, filters || {}, userId);
    setAuditData(res as any, { action: "create", entityType: "report", entityId: report.reportId || templateId, afterState: report });
    emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report', entityId: report.reportId || templateId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.status(201).json(report);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("Unknown report template") || toErrorMessage(err).includes("Invalid filters") ? 400 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// POST /api/report-ext/schedule — Schedule a report
router.post("/schedule", authenticate, requirePermission("report.document.write"), validate({ body: createScheduleBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { templateId, cronExpression, recipients, filters } = req.body;
    if (!templateId || !cronExpression || !recipients) {
      res.status(400).json({ error: "templateId, cronExpression, and recipients are required" });
      return;
    }
    const schedule = await scheduleReport(
      tenantId,
      templateId,
      { cronExpression, recipients, filters: filters || {} },
      userId
    );
    setAuditData(res as any, { action: "create", entityType: "report_schedule", entityId: schedule.scheduleId || templateId, afterState: schedule });
    emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report_schedule', entityId: schedule.scheduleId || templateId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.status(201).json(schedule);
  } catch (err: unknown) {
    const status = toErrorMessage(err).includes("Unknown report template") ? 400 : 500;
    res.status(status).json({ error: toErrorMessage(err) });
  }
});

// GET /api/report-ext/maturity-scorecard — Get maturity scorecard
router.get("/maturity-scorecard", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const frameworkId = req.query.frameworkId as string | undefined;
  const scorecard = await getMaturityScorecard(tenantId, frameworkId);
  res.json(scorecard);
});

// POST /api/report-ext/evidence-pack-export — Export evidence pack
router.post("/evidence-pack-export", authenticate, requirePermission("report.document.write"), validate({ body: createEvidencepackexportBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { frameworkId, controlIds } = req.body;
  if (!frameworkId) {
    res.status(400).json({ error: "frameworkId is required" });
    return;
  }
  const pack = await exportEvidencePack(tenantId, frameworkId, controlIds);
  setAuditData(res as any, { action: "create", entityType: "report", entityId: frameworkId, afterState: pack });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report', entityId: frameworkId } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(pack);
});

// GET /api/report-ext/board-view — Board-level executive summary
router.get("/board-view", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const language = (req.query.language as "ar" | "en") || "en";
  const view = await getBoardView(tenantId, language);
  res.json(view);
});

export default router;

