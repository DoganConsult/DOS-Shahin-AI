import { Request, Response, NextFunction as _NextFunction, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { createVendorIdCalculateBody, createBulkrecalculateBody, createVendorIdCyberratingBody } from "../schemas/vendor.schemas";

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendors"));

router.post("/:vendorId/calculate", authenticate, requirePermission("vendor.record.write"), validate({ body: createVendorIdCalculateBody }), async (req: Request, res: Response) => {
  const { calculateVendorScore } = await import("../services/vendor/vendor-scoring.service.js");
  const result = await calculateVendorScore(req.tenantId!, req.params.vendorId, req.body.weights);
  setAuditData(res as any, { action: "update", entityType: "vendor_score", entityId: req.params.vendorId, afterState: { score: result.overallScore, grade: result.grade } });
  res.json(result);
});

router.post("/bulk-recalculate", authenticate, requirePermission("vendor.record.manage"), validate({ body: createBulkrecalculateBody }), async (req: Request, res: Response) => {
  const { bulkRecalculateVendorScores } = await import("../services/vendor/vendor-scoring.service.js");
  const result = await bulkRecalculateVendorScores(req.tenantId!);
  setAuditData(res as any, { action: "update", entityType: "vendor_score", entityId: "bulk", afterState: result });
  res.json(result);
});

router.get("/:vendorId/history", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { getVendorScoreHistory } = await import("../services/vendor/vendor-scoring.service.js");
  res.json({ data: await getVendorScoreHistory(req.tenantId!, req.params.vendorId) });
});

router.post("/:vendorId/cyber-rating", authenticate, requirePermission("vendor.record.manage"), validate({ body: createVendorIdCyberratingBody }), async (req: Request, res: Response) => {
  const { fetchCyberRating } = await import("../services/vendor/vendor-cyber-rating.service.js");
  const result = await fetchCyberRating(req.tenantId!, req.params.vendorId, req.body);
  setAuditData(res as any, { action: "update", entityType: "vendor_cyber_rating", entityId: req.params.vendorId, afterState: { score: result.overallScore } });
  res.json(result);
});

export default router;

