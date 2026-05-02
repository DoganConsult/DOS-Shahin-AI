import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Vendor Cyber Rating Routes
// Fetch cyber ratings from external providers
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  fetchCyberRating,
  bulkFetchCyberRatings,
} from '../services/vendor/vendor-cyber-rating.service';


// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createVendorIdFetchBody, createBulkfetchBody } from "../schemas/vendor.schemas";

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendors"));

// POST /:vendorId/fetch — Fetch cyber rating for a specific vendor
router.post("/:vendorId/fetch", authenticate, requirePermission("vendor.record.manage"), validate({ body: createVendorIdFetchBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { vendorId } = req.params;
  const { provider, apiKey } = req.body;
  const rating = await fetchCyberRating(tenantId, vendorId, { provider, apiKey });
  setAuditData(res as any, { action: "update", entityType: "vendor_cyber_rating", entityId: vendorId, afterState: { score: rating.overallScore, grade: rating.grade } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'vendors', event: 'updated', entityType: 'vendor_cyber_rating', entityId: vendorId } as any)), { tenantId: tenantId, operation: 'grcEvent:vendors.vendor_cyber_rating.updated' });
  res.json(rating);
});

// POST /bulk-fetch — Bulk fetch cyber ratings for all eligible vendors
router.post("/bulk-fetch", authenticate, requirePermission("vendor.record.manage"), validate({ body: createBulkfetchBody }), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { provider, apiKey } = req.body;
  const result = await bulkFetchCyberRatings(tenantId, { provider, apiKey });
  setAuditData(res as any, { action: "update", entityType: "vendor_cyber_rating", entityId: "bulk", afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'vendors', event: 'updated', entityType: 'vendor_cyber_rating', entityId: 'bulk' } as any)), { tenantId: tenantId, operation: 'grcEvent:vendors.vendor_cyber_rating.updated' });
  res.json(result);
});

export default router;

