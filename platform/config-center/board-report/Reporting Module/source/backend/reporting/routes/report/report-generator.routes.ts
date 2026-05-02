import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Report Generator Routes
// ============================================


import { authenticate, requirePermission } from '../../ports/auth.port';
import { getReportTemplates, generateReport, createReportSchedule } from '../../services/report/report-generator.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { createKeyGenerateBody, createSchedulesBody } from "../../schemas/reporting.schemas";

const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware("reporting"));
router.use(automationMiddleware("reporting"));

// GET /api/report-templates — List available report templates
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (_req: Request, res: Response) => {
  res.json(getReportTemplates());
});

// POST /api/report-templates/:key/generate — Generate report from template
router.post("/:key/generate", authenticate, requirePermission("report.document.write"), validate({ body: createKeyGenerateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId!;
    const params = { ...req.body, _userId: userId };
    const data = await generateReport(tenantId, req.params.key, params);
    setAuditData(res as any, { action: "create", entityType: "report", entityId: req.params.key, afterState: data });
    emitEvent(({ tenantId, userId, module: 'reporting', event: 'created', entityType: 'report', entityId: req.params.key } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json(data);
  } catch (err: unknown) {
    if (toErrorMessage(err).startsWith("Unknown report template")) {
      res.status(400).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/report-templates/schedules — Create report schedule
router.post("/schedules", authenticate, requirePermission("report.document.write"), validate({ body: createSchedulesBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const { templateKey, cronExpression, params } = req.body;
  if (!templateKey || !cronExpression) {
    res.status(400).json({ error: "templateKey and cronExpression are required" });
    return;
  }
  const schedule = await createReportSchedule(tenantId, templateKey, cronExpression, params || {}, userId);

  setAuditData(res as any, { action: "create", entityType: "report_schedule", entityId: schedule.scheduleId || templateKey, afterState: schedule });

  emitEvent(({ tenantId, userId, module: 'reporting', event: 'created', entityType: 'report_schedule', entityId: schedule.scheduleId || templateKey } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(schedule);
});

export default router;

