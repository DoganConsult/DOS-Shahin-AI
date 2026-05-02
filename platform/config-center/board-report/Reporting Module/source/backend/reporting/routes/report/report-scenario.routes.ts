import { Request, Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../ports/auth.port';
import { getReportTemplates, generateReport, createReportSchedule } from '../../services/report/report-generator.service';
import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { createTypeGenerateBody, createSchedulesBody } from "../../schemas/reporting.schemas";

const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware("reporting"));
router.use(automationMiddleware("reporting"));
router.use(authenticate, requirePermission("report.document.read"));

// GET /api/report-scenarios — list all available report types
router.get("/", validate({ query: z.record(z.unknown()) }), (_req: Request, res: Response) => {
  res.json(getReportTemplates());
});

// POST /api/report-scenarios/:type/generate — generate report with parameters
router.post("/:type/generate", validate({ body: createTypeGenerateBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const data = await generateReport(tenantId, req.params.type, { ...req.body, _userId: userId });
  setAuditData(res as any, { action: "create", entityType: "report", entityId: req.params.type, afterState: data });
  emitEvent(({ tenantId, userId, module: 'reporting', event: 'created', entityType: 'report', entityId: req.params.type } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(data);
});

// POST /api/report-scenarios/schedules — create report schedule
router.post("/schedules", validate({ body: createSchedulesBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { templateKey, cronExpression, parameters } = req.body;
  if (!templateKey || !cronExpression) {
    res.status(400).json({ error: "templateKey and cronExpression are required" });
    return;
  }
  const schedule = await createReportSchedule(tenantId, templateKey, cronExpression, parameters || {}, userId);

  setAuditData(res as any, { action: "create", entityType: "report_schedule", entityId: schedule.scheduleId || templateKey, afterState: schedule });

  emitEvent(({ tenantId, userId, module: 'reporting', event: 'created', entityType: 'report_schedule', entityId: schedule.scheduleId || templateKey } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(schedule);
});

// GET /api/report-scenarios/schedules — list schedules
router.get("/schedules", validate({ query: z.record(z.unknown()) }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".report_schedules ORDER BY created_at DESC`);
  res.json(result.rows);
});

export default router;

