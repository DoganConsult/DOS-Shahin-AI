import { Request, Response, Router } from 'express';
import { z } from "zod";

/**
 * Compliance Diagnostics & Dashboard Routes
 * @owner compliance
 * @module compliance
 * @since 2026-03-31
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack } from '../../ports/middleware.port';
import {
  runComplianceDiagnostics,
  getOverdueObligationsDiagnostics,
  getMappingDriftDiagnostics,
  getMissingEvidenceDiagnostics,
  getAssessmentPipelineDiagnostics,
  getBlockedReviewDiagnostics,
} from '../diagnostics/compliance-diagnostics.service';
import { validate } from "../../ports/middleware.port";
const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));

router.get('/diagnostics', authenticate, requirePermission('compliance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await runComplianceDiagnostics(req.tenantId);
  res.json({ success: true, data: result });
}));

router.get('/diagnostics/overdue-obligations', authenticate, requirePermission('compliance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = await getOverdueObligationsDiagnostics(req.tenantId, limit);
  res.json({ success: true, data, total: data.length });
}));

router.get('/diagnostics/mapping-drift', authenticate, requirePermission('compliance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = await getMappingDriftDiagnostics(req.tenantId, limit);
  res.json({ success: true, data, total: data.length });
}));

router.get('/diagnostics/missing-evidence', authenticate, requirePermission('compliance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = await getMissingEvidenceDiagnostics(req.tenantId, limit);
  res.json({ success: true, data, total: data.length });
}));

router.get('/diagnostics/assessment-pipeline', authenticate, requirePermission('compliance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = await getAssessmentPipelineDiagnostics(req.tenantId, limit);
  res.json({ success: true, data, total: data.length });
}));

router.get('/diagnostics/blocked-reviews', authenticate, requirePermission('compliance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const data = await getBlockedReviewDiagnostics(req.tenantId, limit);
  res.json({ success: true, data, total: data.length });
}));

export default router;
