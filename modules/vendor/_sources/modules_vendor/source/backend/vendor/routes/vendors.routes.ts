import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

// ============================================
// Shahin-Ai — Vendor Routes (standardized)
// Uses route-kit: asyncHandler, ok, action,
// NotFoundError, validate, Zod schemas
// ============================================
import { authenticate, requirePermission } from '../ports/auth.port';
import { assessVendor, getVendors, getVendorById, updateVendor, monitorSLA } from '../services/vendor/vendor.service';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow, getFirstRowOrThrow } from '@dos/db';
import { emitEvent } from '../ports/events.port';
import {
  validate, ok, action, NotFoundError, parsePagination as _parsePagination, expensiveRateLimit as _expensiveRateLimit,
} from "../../utils/route-kit";

// ── Zod Schemas ──────────────────────────────────────────────────────
import { asyncHandler, requireOwnership, auditMiddleware, setAuditData, automationMiddleware, lifecycleGate, fieldRbacFilter, enforceMandatoryFields, enforceStageGates, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { idParam, createVendorBody, updateVendorBody } from "../schemas/vendor.schemas";

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendors"));
router.use(automationMiddleware("vendors"));
router.use(fieldRbacFilter("vendor"));
router.use(enforceMandatoryFields("vendor"));
router.use(enforceStageGates("vendor"));

/**
 * @openapi
 * /vendors:
 *   get:
 *     tags: [Vendors]
 *     summary: List all vendors
 *     security: [{ bearerAuth: [] }]
 *     responses:
 *       200:
 *         description: Array of vendors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 vendors:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Vendor'
 *                 count:
 *                   type: integer
 */
router.get("/", authenticate, requirePermission("vendor.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const user = req.user!;
  const vendors = await getVendors(req.tenantId!, user ? { userId: user.userId, role: user.role } : undefined);
  res.json(ok({ vendors, count: vendors.length }, req));
}));

/**
 * @openapi
 * /vendors/{id}:
 *   get:
 *     tags: [Vendors]
 *     summary: Get vendor by ID
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Vendor details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Vendor'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
// GET /api/vendors/:id -- Get a single vendor
router.get("/:id", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const vendor = await getVendorById(req.tenantId!, id);
  if (!vendor) throw new NotFoundError("vendor", id);
  res.json(ok(vendor, req));
}));

/**
 * @openapi
 * /vendors:
 *   post:
 *     tags: [Vendors]
 *     summary: Create a new vendor
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Vendor'
 *     responses:
 *       201:
 *         description: Vendor created
 *       400:
 *         description: Validation error
 */
router.post("/", authenticate, requirePermission("vendor.record.write"), validate({ body: createVendorBody }), asyncHandler(async (req: Request, res: Response) => {
  // Resolve org_unit_id from user's department for enterprise auth scope binding
  let orgUnitId: number | null = null;
  try {
    const _schema = tenantSchema(req.tenantId!);
    const _deptRes = await safeQuery(
      `SELECT d.id FROM "${_schema}".departments d JOIN "${_schema}".users u ON u.department_id = d.id WHERE u.user_id = $1 LIMIT 1`,
      [req.user?.userId]);
    orgUnitId = getFirstRow(_deptRes)?.id || null;
  } catch { /* best effort */ }
  const vendor = await assessVendor(req.tenantId!, { ...req.body, createdBy: req.user?.userId, org_unit_id: orgUnitId });

  setAuditData(res as any, { action: "create", entityType: "vendor", entityId: vendor.vendor_id, afterState: vendor });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: "vendors", event: "created", entityType: "vendor", entityId: vendor.vendor_id, data: vendor } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor.created' });
  res.status(201).json(ok(vendor, req));
}));

// PUT /api/vendors/:id -- Update a vendor
router.put("/:id", authenticate, requirePermission("vendor.record.write"), requireOwnership("vendor"), lifecycleGate("vendor"), validate({ params: idParam, body: updateVendorBody }), asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const before = await getVendorById(req.tenantId!, id);
  if (!before) throw new NotFoundError("vendor", id);
  const vendor = await updateVendor(req.tenantId!, id, req.body);
  setAuditData(res as any, { action: "update", entityType: "vendor", entityId: id, beforeState: before, afterState: vendor });
  const vendorEvt = req.body.risk_level && before?.risk_level !== req.body.risk_level ? "risk_changed" : "updated";
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: "vendors", event: vendorEvt, entityType: "vendor", entityId: id, data: vendor, previousData: before } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor.any' });
  res.json(ok(vendor, req));
}));

// GET /api/vendors/:id/sla -- Get SLA monitoring data for a vendor
router.get("/:id/sla", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const sla = await monitorSLA(req.tenantId!, id);
  res.json(ok(sla, req));
}));

// DELETE /api/vendors/:id -- Soft-delete a vendor
router.delete("/:id", authenticate, requirePermission("vendor.record.write"), requireOwnership("vendor"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const id = req.params.id;
  const vendor = await getVendorById(req.tenantId!, id);
  if (!vendor) throw new NotFoundError("vendor", id);
  await updateVendor(req.tenantId!, id, { status: "archived" });
  setAuditData(res as any, { action: "delete", entityType: "vendor", entityId: id, beforeState: vendor });
  res.json(action("vendor.deleted", req));
}));

// ════════════════════════════════════════════════════════════════════════
// VENDOR DETAIL -- Cross-module aggregation endpoints
// ════════════════════════════════════════════════════════════════════════

// GET /api/vendors/:id/assessments -- Vendor assessment history
router.get("/:id/assessments", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".vendor_assessments WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json(ok(result.rows, req));
}));

// GET /api/vendors/:id/documents -- Vendor documents
router.get("/:id/documents", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".vendor_documents WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json(ok(result.rows, req));
}));

// GET /api/vendors/:id/findings -- Vendor findings
router.get("/:id/findings", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".vendor_findings WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json(ok(result.rows, req));
}));

// GET /api/vendors/:id/timeline -- Vendor audit log timeline
router.get("/:id/timeline", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".vendor_audit_log WHERE vendor_id = $1 ORDER BY created_at DESC LIMIT 50`,
    [req.params.id]
  );
  res.json(ok(result.rows, req));
}));

// GET /api/vendors/:id/shared-responsibility -- Shared responsibility matrix
router.get("/:id/shared-responsibility", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".vendor_shared_responsibility WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [req.params.id]
  );
  res.json(ok(result.rows, req));
}));

// GET /api/vendors/:id/scorecard -- Calculate vendor scorecard
router.get("/:id/scorecard", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const { calculateVendorScore } = await import("../services/vendor/vendor-scoring.service.js");
  const scorecard = await calculateVendorScore(req.tenantId!, req.params.id);
  res.json(ok(scorecard, req));
}));

// POST /api/vendors/:id/score -- Trigger vendor score calculation
router.post("/:id/score", authenticate, requirePermission("vendor.record.write"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const { calculateVendorScore } = await import("../services/vendor/vendor-scoring.service.js");
  const scorecard = await calculateVendorScore(req.tenantId!, req.params.id);
  res.json(ok(scorecard, req));
}));

// POST /api/vendors/:id/propagate -- Trigger vendor risk cross-agent propagation
router.post("/:id/propagate", authenticate, requirePermission("vendor.record.write"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const { runVendorCrossAgentPropagation } = await import("../services/vendor/vendor-cross-agent.service.js");
  const result = await runVendorCrossAgentPropagation(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}));

// GET /api/vendors/:id/privacy -- Vendor privacy/DPIA summary
router.get("/:id/privacy", authenticate, requirePermission("vendor.record.read"), validate({ params: idParam }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT vendor_id, name, dpia_required, dpia_completed_at, dpa_signed_at,
            data_classification_level, data_residency_country,
            (SELECT COUNT(*)::int FROM "${schema}".vendor_documents vd WHERE vd.vendor_id = v.vendor_id AND vd.document_type = 'dpa') AS dpa_count,
            (SELECT COUNT(*)::int FROM "${schema}".vendor_subcontractors vs WHERE vs.vendor_id = v.vendor_id AND vs.has_data_access = true) AS data_sub_vendors
     FROM "${schema}".vendors v WHERE v.vendor_id = $1`,
    [req.params.id]
  );
  if (!result.rows.length) throw new NotFoundError("vendor", req.params.id);
  res.json(ok(getFirstRowOrThrow(result, 'Vendor not found'), req));
}));

export default router;
