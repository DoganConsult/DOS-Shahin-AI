import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — NCA ECC Self-Assessment Routes
// CRUD + scoring + multi-format export
// ============================================


import { authenticate, requirePermission } from '../../../../ports/auth.port';
import {
  getECCStructure,
  createNCAAssessment,
  getNCAAssessment,
  listNCAAssessments,
  updateNCAItems,
  deleteNCAAssessment,
  ensureNCATable,
} from '../../../services/misc/nca-assessment.service';
import {
  exportNCAAssessmentPDF,
  exportNCAAssessmentExcel,
  exportNCAAssessmentHTML,
} from '../../../services/misc/nca-export.service';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { createAssessmentBody, updateItemsBody, genericComplianceSchema } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));
router.use(automationMiddleware("compliance"));

// GET /api/nca-assessment/structure — Get ECC framework structure
router.get(
  "/structure", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("assessment.record.read"),
  async (_req: Request, res: Response) => {
    const structure = getECCStructure();
    res.json(structure);
  }
);

// GET /api/nca-assessment — List all assessments
router.get(
  "/", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("assessment.record.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await ensureNCATable(tenantId);
    const list = await listNCAAssessments(tenantId);
    res.json({ assessments: list });
  }
);

// POST /api/nca-assessment — Create new assessment
router.post(
  "/",
  authenticate,
  requirePermission("assessment.record.write"),
  validate({ body: createAssessmentBody }),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const userId = req.user!.userId!;
    await ensureNCATable(tenantId);
    const result = await createNCAAssessment(tenantId, {
      title: req.body.title,
      createdBy: userId,
    });

    setAuditData(res as any, { action: "create", entityType: "nca_assessment", entityId: (result as Record<string, unknown>).assessmentId ?? (result as Record<string, unknown>).assessment_id, afterState: result });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: 'assessments', event: 'created', entityType: 'nca_assessment', entityId: (result as Record<string, unknown>).assessmentId ?? (result as Record<string, unknown>).assessment_id ?? '' } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.nca_assessment.created' });
    res.status(201).json(result);
  }
);

// GET /api/nca-assessment/:id — Get assessment with scores
router.get(
  "/:id", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("assessment.record.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await ensureNCATable(tenantId);
    const assessment = await getNCAAssessment(tenantId, req.params.id as string);
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    res.json(assessment);
  }
);

// PUT /api/nca-assessment/:id/items — Batch update items
router.put(
  "/:id/items",
  authenticate,
  requirePermission("assessment.record.write"),
  validate({ body: updateItemsBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.user!.tenantId!;
      await ensureNCATable(tenantId);
      const { updates } = req.body;
      if (!Array.isArray(updates) || updates.length === 0) {
        res.status(400).json({ error: "updates array required" });
        return;
      }
      const result = await updateNCAItems(tenantId, req.params.id as string, updates);
      setAuditData(res as any, { action: "update", entityType: "nca_assessment", entityId: req.params.id, afterState: result });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'assessments', event: 'updated', entityType: 'nca_assessment', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.nca_assessment.updated' });
      res.json(result);
    } catch (err: unknown) {
      const status = toErrorMessage(err) === "Assessment not found" ? 404 : toErrorMessage(err).startsWith("Invalid status") ? 400 : 500;
      res.status(status).json({ error: toErrorMessage(err) });
    }
  }
);

// DELETE /api/nca-assessment/:id — Delete assessment
router.delete(
  "/:id",
  authenticate,
  requirePermission("assessment.record.write"), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    await ensureNCATable(tenantId);
    const deleted = await deleteNCAAssessment(tenantId, req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    setAuditData(res as any, { action: "delete", entityType: "nca_assessment", entityId: req.params.id });
    swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'assessments', event: 'deleted', entityType: 'nca_assessment', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:assessments.nca_assessment.deleted' });
    res.json({ success: true });
  }
);

// GET /api/nca-assessment/:id/export/pdf — Export as PDF
router.get(
  "/:id/export/pdf", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const lang = (req.query.lang as string) || "en";
    const assessment = await getNCAAssessment(tenantId, req.params.id as string);
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    const pdfBuffer = await exportNCAAssessmentPDF(assessment, lang);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nca-ecc-assessment-${req.params.id}.pdf"`
    );
    res.send(pdfBuffer);
  }
);

// GET /api/nca-assessment/:id/export/excel — Export as Excel
router.get(
  "/:id/export/excel", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const assessment = await getNCAAssessment(tenantId, req.params.id as string);
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    const buffer = await exportNCAAssessmentExcel(assessment);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nca-ecc-assessment-${req.params.id}.xlsx"`
    );
    res.send(buffer);
  }
);

// GET /api/nca-assessment/:id/export/html — Export as interactive HTML
router.get(
  "/:id/export/html", validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission("report.document.read"),
  async (req: Request, res: Response) => {
    const tenantId = req.user!.tenantId!;
    const assessment = await getNCAAssessment(tenantId, req.params.id as string);
    if (!assessment) {
      res.status(404).json({ error: "Assessment not found" });
      return;
    }
    const html = exportNCAAssessmentHTML(assessment);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="nca-ecc-assessment-${req.params.id}.html"`
    );
    res.send(html);
  }
);

export default router;

