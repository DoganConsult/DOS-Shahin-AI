import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Vendor Risk Extension Routes
// Tier classification, onboarding, reviews,
// risk register, shared responsibility
// Requirements: 16.1, 16.2, 16.3, 16.5, 16.6
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import {
  classifyVendor,
  onboardVendor,
  getDueReviews,
  getVendorRiskRegister,
  getSharedResponsibility,
  getVendorQuestionnaires,
  createVendorQuestionnaire,
} from '../services/vendor/vendor-risk-ext.service';
import { emptyResult } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ── Zod Validation Schemas ──
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../ports/middleware.port';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
import { createVendorsidClassifyBody, createVendorsOnboardBody, createProfilesidAssessBody, createQuestionnairesBody, createVendorsQuestionnairesBody } from "../schemas/vendor.schemas";

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendors"));
router.use(automationMiddleware("vendors"));

// POST /api/vendor-risk/vendors/:id/classify — Classify vendor into risk tier
router.post("/vendors/:id/classify", authenticate, requirePermission("vendor.record.manage"), validate({ body: createVendorsidClassifyBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const vendorId = req.params.id;
  const { dataAccess, criticality, regulatoryExposure } = req.body;
  if (dataAccess == null || criticality == null || regulatoryExposure == null) {
  res.status(400).json({ error: "dataAccess, criticality, and regulatoryExposure are required" });
  return;
  }
  const result = await classifyVendor(tenantId, vendorId, { dataAccess, criticality, regulatoryExposure });
  setAuditData(res as any, { action: "update", entityType: "vendor-risk", entityId: vendorId, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'vendors', event: 'created', entityType: 'vendor_risk_ext', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_risk_ext.created' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
});

// POST /api/vendor-risk/vendors/onboard — Onboard a new vendor with tier enforcement
router.post("/vendors/onboard", authenticate, requirePermission("vendor.record.write"), validate({ body: createVendorsOnboardBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const { name, category, factors, completedSteps, contactEmail, contractExpiry } = req.body;
  if (!name || !factors) {
  res.status(400).json({ error: "name and factors are required" });
  return;
  }
  const result = await onboardVendor(tenantId, {
  name,
  category,
  factors,
  completedSteps: completedSteps || [],
  contactEmail,
  contractExpiry,
  });
  if (result.missingSteps.length > 0) {
  res.status(422).json({ error: "Missing onboarding steps", missingSteps: result.missingSteps, tier: result.tier });
  return;
  }

  setAuditData(res as any, { action: "create", entityType: "vendor-risk", entityId: (result as Record<string, unknown>).vendorId ?? (result as Record<string, unknown>).vendor_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'vendors', event: 'created', entityType: 'vendor_risk_ext', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_risk_ext.created' });
  res.status(201).json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});


// GET /api/vendor-risk/profiles — List vendor risk profiles
router.get("/profiles", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { safeQuery, tenantSchema } = await import("../../../config/database.js");
  const schema = tenantSchema(req.tenantId!);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".vendors WHERE deleted_at IS NULL ORDER BY created_at DESC`
  ), { tenantId: req.tenantId!, operation: 'query vendors' });
  res.json({ profiles: result.rows, count: result.rows.length });
});

// GET /api/vendor-risk/profiles/:id — Get single vendor risk profile
router.get("/profiles/:id", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const { safeQuery, tenantSchema } = await import("../../../config/database.js");
  const schema = tenantSchema(req.tenantId!);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`, [req.params.id]
  ), { tenantId: req.tenantId!, operation: 'query vendors' });
  if (!getFirstRow(result)) { res.status(404).json({ error: "Vendor not found" }); return; }
  res.json(getFirstRow(result));
});

// POST /api/vendor-risk/profiles/:id/assess — Create vendor risk assessment
router.post("/profiles/:id/assess", authenticate, requirePermission("vendor.record.write"), validate({ body: createProfilesidAssessBody }), async (req: Request, res: Response) => {
  const { safeQuery, tenantSchema } = await import("../../../config/database.js");
  const schema = tenantSchema(req.tenantId!);
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
  `INSERT INTO "${schema}".vendor_assessments (vendor_id, assessed_by, risk_score, findings, status)
  VALUES ($1, $2, $3, $4, 'completed') RETURNING *`,
  [req.params.id, req.user!.userId!, req.body.risk_score || 0, JSON.stringify(req.body.findings || {})]
  ), { tenantId: req.tenantId!, operation: 'insert vendor_assessments' });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'vendors', event: 'created', entityType: 'vendor_assessment', entityId: getFirstRow(result)?.assessment_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_assessment.created' });
  res.status(201).json(getFirstRow(result) || { success: true });
});

// GET /api/vendor-risk/questionnaires — Alias for /vendors/questionnaires
router.get("/questionnaires", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const questionnaires = await getVendorQuestionnaires(tenantId);
  res.json({ questionnaires, count: questionnaires.length });
});

// POST /api/vendor-risk/questionnaires — Alias for /vendors/questionnaires
router.post("/questionnaires", authenticate, requirePermission("vendor.record.write"), validate({ body: createQuestionnairesBody }), async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { vendor_name, template_name } = req.body;
  if (!vendor_name) { res.status(400).json({ error: "vendor_name is required" }); return; }
  const result = await createVendorQuestionnaire(tenantId, { vendor_name, template_name }, userId);

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: "vendors", event: "created", entityType: "vendor_questionnaire", entityId: result.questionnaire_id || "" } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_questionnaire.created' });
  // Emit vendor.questionnaire_distributed — questionnaire is created in distributed status

  emitEvent(({ tenantId, userId, module: 'vendor', event: 'questionnaire_distributed', entityType: 'vendor_questionnaire', entityId: result.questionnaire_id || '', data: result } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.status(201).json(result);
});

// GET /api/vendor-risk/vendors/questionnaires — List vendor questionnaires
router.get("/vendors/questionnaires", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const questionnaires = await getVendorQuestionnaires(tenantId);
  res.json({ questionnaires, count: questionnaires.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// POST /api/vendor-risk/vendors/questionnaires — Send a vendor questionnaire
router.post("/vendors/questionnaires", authenticate, requirePermission("vendor.record.write"), validate({ body: createVendorsQuestionnairesBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  const { vendor_name, template_name } = req.body;
  if (!vendor_name) {
  res.status(400).json({ error: "vendor_name is required" });
  return;
  }
  const result = await createVendorQuestionnaire(tenantId, { vendor_name, template_name }, userId);

  setAuditData(res as any, { action: "create", entityType: "vendor-questionnaire", entityId: result.questionnaire_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId, module: "vendors", event: "created", entityType: "vendor_questionnaire", entityId: result.questionnaire_id || "" } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_questionnaire.created' });
  // Emit vendor.questionnaire_distributed — questionnaire is created in distributed status

  emitEvent(({ tenantId, userId, module: 'vendor', event: 'questionnaire_distributed', entityType: 'vendor_questionnaire', entityId: result.questionnaire_id || '', data: result } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.status(201).json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/vendor-risk/vendors/reviews/due — Get vendors due for review
router.get("/vendors/reviews/due", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const vendors = await getDueReviews(tenantId);
  res.json({ vendors, count: vendors.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/vendor-risk/vendors/risk-register — Get full vendor risk register
router.get("/vendors/risk-register", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const vendors = await getVendorRiskRegister(tenantId);
  res.json({ vendors, count: vendors.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
});

// GET /api/vendor-risk/vendors/:id/shared-responsibility — Get shared responsibility mapping
router.get("/vendors/:id/shared-responsibility", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try {
  const tenantId = req.tenantId!;
  const vendorId = req.params.id;
  const result = await getSharedResponsibility(tenantId, vendorId);
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
});

export default router;

