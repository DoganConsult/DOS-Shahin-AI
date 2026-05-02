import { Request, Response, Router } from 'express';
import { z } from "zod";

// ============================================
// Shahin-Ai — NCA Export Routes
// NCA ECC assessment export: PDF, Excel, HTML
// ============================================


import { authenticate, requirePermission } from '../../../../ports/auth.port';

import { safeQuery, tenantSchema } from '../../../../ports/database.port';
import { getFirstRowOrThrow } from '@dos/db';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  exportNCAAssessmentPDF,
  exportNCAAssessmentExcel,
  exportNCAAssessmentHTML,
} from '../../../services/misc/nca-export.service';

import { auditMiddleware, moduleStack, validate } from '../../../../ports/middleware.port';
const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware("compliance"));

/**
 * Helper to fetch an NCA assessment from the tenant schema.
 * The NCA export service expects a full AssessmentResult object.
 */
async function fetchAssessment(tenantId: string, assessmentId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".nca_assessments WHERE assessment_id = $1`,
    [assessmentId],
  );
  if (result.rows.length === 0) {
    throw new Error("NCA assessment not found");
  }
  return getFirstRowOrThrow(result, 'NCA assessment not found');
}

// GET /:assessmentId/pdf — Export NCA assessment as PDF
router.get("/:assessmentId/pdf", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("assessment.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { assessmentId } = req.params;
  const lang = (req.query.lang as string) || "en";
  const assessment = await fetchAssessment(tenantId, assessmentId);
  const pdfBuffer = await exportNCAAssessmentPDF((assessment as any), lang);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="nca-assessment-${assessmentId}.pdf"`);
  res.send(pdfBuffer);
});

// GET /:assessmentId/excel — Export NCA assessment as Excel
router.get("/:assessmentId/excel", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("assessment.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { assessmentId } = req.params;
  const assessment = await fetchAssessment(tenantId, assessmentId);
  const excelBuffer = await exportNCAAssessmentExcel((assessment as any));
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  res.setHeader("Content-Disposition", `attachment; filename="nca-assessment-${assessmentId}.xlsx"`);
  res.send(excelBuffer);
});

// GET /:assessmentId/html — Export NCA assessment as interactive HTML
router.get("/:assessmentId/html", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("assessment.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { assessmentId } = req.params;
  const assessment = await fetchAssessment(tenantId, assessmentId);
  const html = exportNCAAssessmentHTML((assessment as any));
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(html);
});

export default router;
