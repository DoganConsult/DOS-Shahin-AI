import { Request, Response, Router } from 'express';
import { z } from "zod";

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { generateReport } from '../../services/report/report-generator.service';
import { pushToUser, buildWSEvent } from '@dos/platform-core/events';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../ports/middleware.port';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
import { createGenerateBody, createSchedulesBody, updateSchedulesidToggleBody } from "../../schemas/reporting.schemas";

// Phase 11 (M5): hoist to avoid temporal-dead-zone on module init.
const genericPayloadSchema = z.record(z.unknown());

const router = Router();
router.use(moduleStack('reporting'));
router.use(auditMiddleware("reporting"));
router.use(automationMiddleware("reporting"));

// GET /api/report-center/ — List generated reports
router.get("/", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (req: Request, res: Response) => {
  try {
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(`SELECT * FROM "${schema}".reports WHERE deleted_at IS NULL ORDER BY generated_at DESC`);
    res.json({ reports: result.rows, count: result.rows.length });
  } catch (err: unknown) {
    const errObj = err as { message?: string; code?: string };
    const msg = String(errObj?.message ?? '');
    if (msg.includes('does not exist') || msg.includes('relation') || errObj?.code === '42P01') {
      res.json({ reports: [], count: 0 });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// GET /api/report-center/templates — List report templates
router.get("/templates", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (req: Request, res: Response) => {
  try {
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(`SELECT * FROM "${schema}".report_templates ORDER BY name`);
    res.json({ templates: result.rows });
  } catch (err: unknown) {
    const errObj = err as { message?: string; code?: string };
    const msg = String(errObj?.message ?? '');
    if (msg.includes('does not exist') || msg.includes('relation') || errObj?.code === '42P01') {
      res.json({ templates: [] });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// GET /api/report-center/schedules — List report schedules
router.get("/schedules", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (req: Request, res: Response) => {
  try {
    const schema = tenantSchema(req.tenantId!);
    const result = await safeQuery(`SELECT * FROM "${schema}".report_schedules ORDER BY created_at DESC`);
    res.json({ schedules: result.rows });
  } catch (err: unknown) {
    const errObj = err as { message?: string; code?: string };
    const msg = String(errObj?.message ?? '');
    if (msg.includes('does not exist') || msg.includes('relation') || errObj?.code === '42P01') {
      res.json({ schedules: [] });
    } else {
      res.status(500).json({ error: toErrorMessage(err) });
    }
  }
});

// POST /api/report-center/generate — Generate a report from real tenant data
router.post("/generate", authenticate, requirePermission("report.document.write"), validate({ body: createGenerateBody }), async (req: Request, res: Response) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.user!.userId!;
    const { template_id, params } = req.body;
    if (!template_id) {
      res.status(400).json({ error: "template_id required" });
      return;
    }
    const reportData = await generateReport(tenantId, template_id, { ...params, _userId: userId });
    setAuditData(res as any, { action: "create", entityType: "report", entityId: template_id, afterState: reportData });
    pushToUser(tenantId, userId, buildWSEvent('report_generated', { templateId: template_id, generatedAt: new Date().toISOString() }));
    emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report', entityId: template_id } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json(reportData);
  } catch (err: unknown) {
    if (toErrorMessage(err).startsWith("Unknown report template")) {
      res.status(400).json({ error: toErrorMessage(err) });
      return;
    }
    res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/report-center/schedules — Create a new schedule
router.post("/schedules", authenticate, requirePermission("report.document.write"), validate({ body: createSchedulesBody }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  const { templateKey, cronExpression, parameters } = req.body;
  if (!templateKey || !cronExpression) {
    res.status(400).json({ error: "templateKey and cronExpression are required" });
    return;
  }
  // Validate cron expression
  if (String(cronExpression).trim().split(/\s+/).length < 5) {
    res.status(400).json({ error: "Invalid cronExpression" });
    return;
  }
  const result = await safeQuery(
    `INSERT INTO "${schema}".report_schedules (report_type, parameters, cron_expression, created_by)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [templateKey, JSON.stringify(parameters || {}), cronExpression, userId]
  );
  setAuditData(res as any, { action: "create", entityType: "report", entityId: getFirstRow(result)?.schedule_id, afterState: getFirstRow(result) });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'created', entityType: 'report_schedule', entityId: getFirstRow(result)?.schedule_id } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(getFirstRow(result));
});

// PUT /api/report-center/schedules/:id/toggle — Enable/disable a schedule
router.put("/schedules/:id/toggle", authenticate, requirePermission("report.document.write"), validate({ body: updateSchedulesidToggleBody }), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `UPDATE "${schema}".report_schedules SET enabled = NOT enabled WHERE schedule_id = $1 RETURNING *`,
    [req.params.id]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: "Schedule not found" });
    return;
  }
  setAuditData(res as any, { action: "update", entityType: "report", entityId: req.params.id, afterState: getFirstRow(result) });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'updated', entityType: 'report_schedule', entityId: req.params.id } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(getFirstRow(result));
});

// DELETE /api/report-center/schedules/:id — Delete a schedule
router.delete("/schedules/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("report.document.write"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(`DELETE FROM "${schema}".report_schedules WHERE schedule_id = $1`, [req.params.id]);
  setAuditData(res as any, { action: "delete", entityType: "report", entityId: req.params.id, afterState: { deleted: true } });
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'reporting', event: 'deleted', entityType: 'report_schedule', entityId: req.params.id } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json({ deleted: true });
});

// GET /api/report-center/board-report — Executive board report summary
router.get("/board-report", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("report.document.read"), async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  // Aggregate key metrics across modules for board-level summary
  const [risks, controls, findings, evidence] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, high_critical: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE risk_level IN ('high','critical')) AS high_critical FROM "${schema}".risks WHERE deleted_at IS NULL`), { tenantId: req.tenantId!, operation: 'query risks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, effective: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'effective') AS effective FROM "${schema}".controls WHERE deleted_at IS NULL`), { tenantId: req.tenantId!, operation: 'query risks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, open: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'open') AS open FROM "${schema}".findings WHERE deleted_at IS NULL`), { tenantId: req.tenantId!, operation: 'query risks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, verified: 0 }]), safeQuery(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status IN ('approved','verified')) AS verified FROM "${schema}".evidence_tasks WHERE deleted_at IS NULL`), { tenantId: req.tenantId!, operation: 'query controls' }),
  ]);
  const r = getFirstRow(risks) || {}; const c = getFirstRow(controls) || {};
  const f = getFirstRow(findings) || {}; const e = getFirstRow(evidence) || {};
  res.json({
    generatedAt: new Date().toISOString(),

    risks: { total: r.total, highCritical: r.high_critical },

    controls: { total: c.total, effective: c.effective, effectivenessRate: c.total > 0 ? Math.round((c.effective / c.total) * 100) : 0 },

    findings: { total: f.total, open: f.open },

    evidence: { total: e.total, verified: e.verified, coverageRate: e.total > 0 ? Math.round((e.verified / e.total) * 100) : 0 },
  });
});

export default router;
