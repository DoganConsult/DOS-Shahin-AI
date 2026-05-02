import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — SAMA CSF Self-Assessment Routes
// CRUD + scoring + multi-format export
// ============================================


import { authenticate, requirePermission } from '../../../../ports/auth.port';
import {
  getSAMAStructure,
  createSAMAAssessment,
  getSAMAAssessment,
  listSAMAAssessments,
  updateSAMAItems,
  deleteSAMAAssessment,
  ensureSAMATable,
} from '../../../services/misc/sama-assessment.service';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { createSAMAAssessmentBody, updateSAMAItemsBody, genericComplianceSchema } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// GET /api/sama-assessment/structure — Get SAMA CSF framework structure
router.get(
  "/structure", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("assessment.record.read"),
  async (_req: Request, res: Response) => {
    const structure = getSAMAStructure();
    res.json(structure);
  }
);

// GET /api/sama-assessment — List all SAMA assessments
router.get(
  "/", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("assessment.record.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await ensureSAMATable(tenantId);
    const list = await listSAMAAssessments(tenantId);
    res.json({ assessments: list });
  }
);

// POST /api/sama-assessment — Create new SAMA assessment
router.post(
  "/",
  authenticate,
  requirePermission("assessment.record.write"),
  validate({ body: createSAMAAssessmentBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId!;
    await ensureSAMATable(tenantId);
    const result = await createSAMAAssessment(tenantId, {
      title: req.body.title,
      createdBy: userId,
    });

    setAuditData(res as any, { action: "create", entityType: "sama_assessment", entityId: (result as Record<string, unknown>).assessmentId, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'assessments', event: 'created', entityType: 'sama_assessment', entityId: (result as Record<string, unknown>).assessmentId ?? '' } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.sama_assessment.created' });
    res.status(201).json(result);
  }
);

// GET /api/sama-assessment/:id — Get SAMA assessment with scores
router.get(
  "/:id", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("assessment.record.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await ensureSAMATable(tenantId);
    const assessment = await getSAMAAssessment(tenantId, req.params.id as string);
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    res.json(assessment);
  }
);

// PUT /api/sama-assessment/:id/items — Batch update items
router.put(
  "/:id/items",
  authenticate,
  requirePermission("assessment.record.write"),
  validate({ body: updateSAMAItemsBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      await ensureSAMATable(tenantId);
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ error: "updates array required" });
        return;
      }
      const result = await updateSAMAItems(tenantId, req.params.id as string, updates);
      setAuditData(res as any, { action: "update", entityType: "sama_assessment", entityId: req.params.id, afterState: result });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'assessments', event: 'updated', entityType: 'sama_assessment', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.sama_assessment.updated' });
      res.json(result);
    } catch (err: unknown) {
      const status = toErrorMessage(err) === "Assessment not found" ? 404 : toErrorMessage(err).startsWith("Invalid status") ? 400 : 500;
      res.status(status).json({ error: toErrorMessage(err) });
    }
  }
);

// GET /api/sama-assessment/:id/export/:format — Export SAMA assessment
router.get(
  "/:id/export/:format", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("assessment.record.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await ensureSAMATable(tenantId);
    const assessment = await getSAMAAssessment(tenantId, req.params.id as string);
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }

    const format = req.params.format;
    if (format === 'html') {

      const rows = assessment.items.map((i: Record<string, unknown>) =>
        `<tr><td>${i.controlId}</td><td>${i.titleEn || ''}</td><td>${i.status}</td><td>${i.notes || ''}</td></tr>`
      ).join('');
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>SAMA CSF Assessment</title>
<style>body{font-family:sans-serif;margin:20px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:8px;text-align:left}th{background:#f0f0f0}</style>
</head><body><h1>${assessment.title || 'SAMA CSF Assessment'}</h1>
<p>Overall Score: ${assessment.overallScore?.toFixed(1) ?? 'N/A'}%</p>
<table><thead><tr><th>Control ID</th><th>Title</th><th>Status</th><th>Notes</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Content-Disposition', `attachment; filename="sama-csf-assessment.html"`);
      res.send(html);
    } else if (format === 'pdf' || format === 'excel') {
      const json = JSON.stringify(assessment, null, 2);
      const ext = format === 'pdf' ? 'json' : 'json';
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="sama-csf-assessment.${ext}"`);
      res.send(json);
    } else {
      res.status(400).json({ error: `Unsupported format: ${format}` });
    }
  }
);

// DELETE /api/sama-assessment/:id — Delete SAMA assessment
router.delete(
  "/:id",
  authenticate,
  requirePermission("assessment.record.write"), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await ensureSAMATable(tenantId);
    const deleted = await deleteSAMAAssessment(tenantId, req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    setAuditData(res as any, { action: "delete", entityType: "sama_assessment", entityId: req.params.id });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'assessments', event: 'deleted', entityType: 'sama_assessment', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.sama_assessment.deleted' });
    res.json({ success: true });
  }
);

export default router;

