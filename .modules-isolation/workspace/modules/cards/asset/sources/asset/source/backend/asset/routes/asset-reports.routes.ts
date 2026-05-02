import { Router } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, fieldRbacFilter } from '../ports/middleware.port';
import { getCoverageReport, getAgingReport, getOrphanReport, getClassificationReport } from '../services/asset-reports.service';
import { validate } from "../ports/middleware.port";
const router = Router();
router.use(moduleStack('asset'));
router.use(auditMiddleware('asset'));
router.use(fieldRbacFilter('asset'));

router.get('/coverage', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const report = await getCoverageReport(req.tenantId!);
  res.json({ data: report });
}));

router.get('/aging', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const report = await getAgingReport(req.tenantId!);
  res.json({ data: report });
}));

router.get('/orphans', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const report = await getOrphanReport(req.tenantId!);
  res.json(report);
}));

router.get('/classification', authenticate, requirePermission('asset.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const report = await getClassificationReport(req.tenantId!);
  res.json({ data: report });
}));

export default router;
