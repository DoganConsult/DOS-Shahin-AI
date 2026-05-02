import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
/**
 * Compliance Workspace — Assessments, Audit Readiness, Audit Package,
 *   Traceability Matrix, Coverage Matrix, Export, Auditor Dashboard
 * Sub-router mounted at "/" relative to the compliance-workspace barrel.
 */
import {
  getAuditReadiness,
  getCoverageMatrix,
  getAssessmentHistory,
  exportComplianceReport,
  exportAuditPack,
  getAuditPackage,
  getTraceabilityMatrix,
  assignReviewer,
  submitForReview,
  approveAssessment,
  rejectAssessment,
  getAuditorDashboard,
} from '../../services/compliance/compliance-workspace.service';
import { invalidateComplianceCache } from '../../../ports/platform.port';
import { logComplianceAccess } from '../../../application/compliance/reporting/compliance-observability.service';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../../ports/events.port';
import { auditMiddleware, asyncHandler, setAuditData, rateLimiter, validate, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { assignReviewerBody, approveAssessmentBody, rejectAssessmentBody, auditPackageBody, traceabilityMatrixBody, createSubmitReviewBody } from "../../../schemas/compliance.schemas";
import { requirePermission, authenticate } from '../../../ports/auth.port';

const router = Router();
router.use(authenticate);
router.use(auditMiddleware('compliance'));
router.use(moduleStack('compliance'));

// ── AUDIT READINESS ─────────────────────────────────────────────────

router.get("/audit-readiness", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/audit-readiness";
  try {
    const tenantId = req.tenantId!;
    const user = req.user!;
    const scope = (req.query.scope as string) === "my" ? "my" as const : undefined;
    const userId = scope === "my" ? user?.userId : undefined;
    const data = await getAuditReadiness(tenantId, scope !== undefined ? { scope, userId } : undefined);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── COVERAGE MATRIX ─────────────────────────────────────────────────

router.get("/coverage-matrix/:frameworkId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/coverage-matrix/:frameworkId";
  try {
    const tenantId = req.tenantId!;
    const data = await getCoverageMatrix(tenantId, req.params.frameworkId as string);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── ASSESSMENT HISTORY ──────────────────────────────────────────────

router.get("/assessment-history", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/assessment-history";
  try {
    const tenantId = req.tenantId!;
    const data = await getAssessmentHistory(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── EXPORT ──────────────────────────────────────────────────────────

router.get("/export", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/export";
  try {
    const tenantId = req.tenantId!;
    const format = (req.query.format as string) || "json";
    if (format === "json") {
      const data = await exportComplianceReport(tenantId);
      logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
      return res.json(data);
    }
    const allowedFormats = ["pdf", "xlsx", "zip"];
    if (!allowedFormats.includes(format)) {
      logComplianceAccess(tenantId, path, Date.now() - start, false, 400);
      return res.status(400).json({ error: `Format must be one of: json, ${allowedFormats.join(", ")}` });
    }
    const frameworkId = req.query.frameworkId as string | undefined;
    const frameworkIdsRaw = req.query.frameworkIds;
    const frameworkIds = frameworkIdsRaw
      ? (Array.isArray(frameworkIdsRaw) ? frameworkIdsRaw as string[] : String(frameworkIdsRaw).split(",").map((s) => s.trim()).filter(Boolean))
      : undefined;
    const options = frameworkId ? { frameworkId } : frameworkIds?.length ? { frameworkIds } : undefined;
    const { buffer, filename, contentType } = await exportAuditPack(tenantId, format as "pdf" | "xlsx" | "zip", options);
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.send(buffer);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg("INTERNAL_ERROR", req) });
  }
});

// ── AUDIT PACKAGE ───────────────────────────────────────────────────

router.get("/audit-package", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/audit-package";
  try {
    const tenantId = req.tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const frameworkIdsRaw = req.query.frameworkIds;
    const frameworkIds = frameworkIdsRaw
      ? (Array.isArray(frameworkIdsRaw) ? frameworkIdsRaw as string[] : String(frameworkIdsRaw).split(",").map((s) => s.trim()).filter(Boolean))
      : undefined;
    const options = frameworkId ? { frameworkId } : frameworkIds?.length ? { frameworkIds } : undefined;
    const data = await getAuditPackage(tenantId, options);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.post("/audit-package", authenticate, requirePermission("framework.record.read"), validate({ body: auditPackageBody }), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/audit-package";
  try {
    const tenantId = req.tenantId!;
    const body = req.body || {};
    const options = (body.frameworkId && { frameworkId: body.frameworkId }) ||
      (Array.isArray(body.frameworkIds) && body.frameworkIds.length > 0 && { frameworkIds: body.frameworkIds }) ||
      undefined;
    const data = await getAuditPackage(tenantId, options);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── TRACEABILITY MATRIX ─────────────────────────────────────────────

router.get("/traceability-matrix", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("framework.record.read"), rateLimiter, async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/traceability-matrix";
  try {
    const tenantId = req.tenantId!;
    const frameworkId = req.query.frameworkId as string | undefined;
    const frameworkIdsRaw = req.query.frameworkIds;
    const frameworkIds = frameworkIdsRaw
      ? (Array.isArray(frameworkIdsRaw) ? frameworkIdsRaw as string[] : String(frameworkIdsRaw).split(",").map((s) => s.trim()).filter(Boolean))
      : undefined;
    const options = frameworkId ? { frameworkId } : frameworkIds?.length ? { frameworkIds } : undefined;
    const data = await getTraceabilityMatrix(tenantId, options);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

router.post("/traceability-matrix", authenticate, requirePermission("framework.record.read"), rateLimiter, validate({ body: traceabilityMatrixBody }), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/traceability-matrix";
  try {
    const tenantId = req.tenantId!;
    const body = req.body || {};
    const options = (body.frameworkId && { frameworkId: body.frameworkId }) ||
      (Array.isArray(body.frameworkIds) && body.frameworkIds.length > 0 && { frameworkIds: body.frameworkIds }) ||
      undefined;
    const data = await getTraceabilityMatrix(tenantId, options);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

// ── ASSESSMENT REVIEW / APPROVAL ────────────────────────────────────

router.post("/assessments/:id/assign-reviewer", authenticate, requirePermission("control.record.write"), validate({ body: assignReviewerBody }), asyncHandler(async (req, res) => {
  const { reviewerId } = req.body;
  if (!reviewerId) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const tenantId = req.tenantId!;
  const data = await assignReviewer(tenantId, req.params.id as string, reviewerId);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "assessment", entityId: req.params.id as string, afterState: data });
  res.json(data);
}));

router.post("/assessments/:id/submit-review", authenticate, requirePermission("control.record.write"), validate({ body: createSubmitReviewBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await submitForReview(tenantId, req.params.id as string);
  if (!data) { res.status(400).json({ error: "Assessment not in valid state for review submission" }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "assessment", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'assessment_review', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.assessment_review.updated' });
  res.json(data);
}));

router.post("/assessments/:id/approve", authenticate, requirePermission("control.record.write"), validate({ body: approveAssessmentBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await approveAssessment(tenantId, req.params.id as string, req.body.notes);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "assessment", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'assessment_review', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.assessment_review.updated' });
  // Emit assessment_completed event when assessment is approved

  emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'assessment_completed', entityType: 'assessment', entityId: req.params.id as string, data } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.json(data);
}));

router.post("/assessments/:id/reject", authenticate, requirePermission("control.record.write"), validate({ body: rejectAssessmentBody }), asyncHandler(async (req, res) => {
  const { notes } = req.body;
  if (!notes) { res.status(400).json({ error: "Rejection notes are required" }); return; }
  const tenantId = req.tenantId!;
  const data = await rejectAssessment(tenantId, req.params.id as string, notes);
  if (!data) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await invalidateComplianceCache(tenantId);
  setAuditData(res as any, { action: "update", entityType: "assessment", entityId: req.params.id as string, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'compliance', event: 'updated', entityType: 'assessment_review', entityId: req.params.id as string } as any)), { tenantId: tenantId, operation: 'grcEvent:compliance.assessment_review.updated' });
  res.json(data);
}));

// ── AUDITOR DASHBOARD ───────────────────────────────────────────────

router.get("/auditor-dashboard", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("audit.record.read"), async (req: Request, res: Response) => {
  const start = Date.now();
  const path = "/auditor-dashboard";
  try {
    const tenantId = req.tenantId!;
    const data = await getAuditorDashboard(tenantId);
    logComplianceAccess(tenantId, path, Date.now() - start, false, 200);
    res.json(data);
  } catch (_err: unknown) {
    logComplianceAccess(req.tenantId ?? "", path, Date.now() - start, false, 500);
    res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
});

export default router;

