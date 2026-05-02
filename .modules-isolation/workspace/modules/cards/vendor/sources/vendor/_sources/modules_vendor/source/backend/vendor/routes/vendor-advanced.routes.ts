import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  initiateDueDiligence, getDueDiligenceStatus, updateDueDiligenceStep,
  addSubVendor, getSubVendors, getSubVendorRiskExposure,
  checkVendorSLABreaches, recordSLAMetric,
  getConcentrationRisk, assessConcentrationRisk,
  initiateOffboarding, getOffboardingChecklist, updateOffboardingStep,
  getVendorMonitoringSignals, recordMonitoringSignal,
  autoTierVendors, linkVendorsBySharedSubVendor,
} from '../services/vendor/vendor-advanced.service';


// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createDuediligenceBody, updateDuediligenceStepsstepIdBody, createFourthpartyBody, createSlametricBody, createConcentrationAssessBody, createLinksharedsubvendorsBody, createOffboardingBody, updateOffboardingStepsstepIdBody, createMonitoringBody, createAutotierBody } from "../schemas/vendor.schemas";

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendors"));

const emit = (req: Request, event: string, entityType: string, entityId: string, data?: any) =>
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'vendors', event, entityType, entityId, data } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.any.any' });

router.post("/due-diligence", authenticate, requirePermission("vendor.record.write"), validate({ body: createDuediligenceBody }), asyncHandler(async (req, res) => {
  const dd = await initiateDueDiligence(req.tenantId!, { ...req.body, initiated_by: req.body.initiated_by || req.user!.userId! });
  if (!dd) { res.status(500).json({ error: "Failed to initiate due diligence" }); return; }
  setAuditData(res as any, { action: "create", entityType: "vendor_dd", entityId: dd.dd_id, afterState: dd });
  emit(req, "dd_initiated", "vendor_dd", dd.dd_id, req.body);
  res.status(201).json(dd);
}));

router.get("/due-diligence/:vendorId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getDueDiligenceStatus(req.tenantId!, req.params.vendorId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.put("/due-diligence/steps/:stepId", authenticate, requirePermission("vendor.record.write"), validate({ body: updateDuediligenceStepsstepIdBody }), asyncHandler(async (req, res) => {
  const step = await updateDueDiligenceStep(req.tenantId!, req.params.stepId, { ...req.body, completed_by: req.body.completed_by || req.user?.userId });
  setAuditData(res as any, { action: "update", entityType: "vendor_dd_step", entityId: req.params.stepId, afterState: step });
  emit(req, "dd_step_updated", "vendor_dd_step", req.params.stepId, req.body);
  res.json(step);
}));

router.post("/fourth-party", authenticate, requirePermission("vendor.record.write"), validate({ body: createFourthpartyBody }), asyncHandler(async (req, res) => {
  const sv = await addSubVendor(req.tenantId!, req.body);
  if (!sv) { res.status(500).json({ error: "Failed to add fourth party" }); return; }
  setAuditData(res as any, { action: "create", entityType: "vendor_fourth_party", entityId: sv.fp_risk_id, afterState: sv });
  emit(req, "fourth_party_added", "fourth_party", sv.fp_risk_id, req.body);
  res.status(201).json(sv);
}));

router.get("/fourth-party/:vendorId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getSubVendors(req.tenantId!, req.params.vendorId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.get("/fourth-party/:vendorId/exposure", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getSubVendorRiskExposure(req.tenantId!, req.params.vendorId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.get("/sla-breaches", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try { res.json(await checkVendorSLABreaches(req.tenantId!, req.query.vendor_id as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/sla-metric", authenticate, requirePermission("vendor.record.write"), validate({ body: createSlametricBody }), asyncHandler(async (req, res) => {
  const m = await recordSLAMetric(req.tenantId!, req.body);
  if (!m) { res.status(500).json({ error: "Failed to record SLA metric" }); return; }
  setAuditData(res as any, { action: "create", entityType: "vendor_sla_measurement", entityId: m.measurement_id, afterState: m });
  emit(req, "sla_metric_recorded", "vendor_sla", m.measurement_id, req.body);
  res.status(201).json(m);
}));

router.get("/concentration", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getConcentrationRisk(req.tenantId!, req.query.dimension as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/concentration/assess", authenticate, requirePermission("vendor.record.write"), validate({ body: createConcentrationAssessBody }), asyncHandler(async (req, res) => {
  const result = await assessConcentrationRisk(req.tenantId!);
  setAuditData(res as any, { action: "update", entityType: "vendor_concentration", entityId: "bulk", afterState: result });
  emit(req, "concentration_assessed", "vendor_concentration", "bulk", result);
  res.json(result);
}));

router.post("/link-shared-subvendors", authenticate, requirePermission("vendor.record.write"), validate({ body: createLinksharedsubvendorsBody }), asyncHandler(async (req, res) => {
  const result = await linkVendorsBySharedSubVendor(req.tenantId!);
  setAuditData(res as any, { action: "create", entityType: "vendor", entityId: "multi_vendor", afterState: result });
  emit(req, "multi_vendor_linked", "vendor", "multi_vendor", result);
  res.json(result);
}));

router.post("/offboarding", authenticate, requirePermission("vendor.record.write"), validate({ body: createOffboardingBody }), asyncHandler(async (req, res) => {
  const ob = await initiateOffboarding(req.tenantId!, { ...req.body, initiated_by: req.body.initiated_by || req.user!.userId! });
  if (!ob) { res.status(500).json({ error: "Failed to initiate offboarding" }); return; }
  setAuditData(res as any, { action: "create", entityType: "vendor_offboarding", entityId: ob.offboarding_id, afterState: ob });
  emit(req, "offboarding_initiated", "vendor_offboarding", ob.offboarding_id, req.body);
  res.status(201).json(ob);
}));

router.get("/offboarding/:vendorId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getOffboardingChecklist(req.tenantId!, req.params.vendorId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.put("/offboarding/steps/:stepId", authenticate, requirePermission("vendor.record.write"), validate({ body: updateOffboardingStepsstepIdBody }), asyncHandler(async (req, res) => {
  const step = await updateOffboardingStep(req.tenantId!, req.params.stepId, { ...req.body, completed_by: req.body.completed_by || req.user?.userId });
  setAuditData(res as any, { action: "update", entityType: "vendor_offboarding_step", entityId: req.params.stepId, afterState: step });
  emit(req, "offboarding_step_updated", "vendor_offboarding", req.params.stepId, req.body);
  res.json(step);
}));

router.get("/monitoring/:vendorId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("vendor.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getVendorMonitoringSignals(req.tenantId!, req.params.vendorId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/monitoring", authenticate, requirePermission("vendor.record.write"), validate({ body: createMonitoringBody }), asyncHandler(async (req, res) => {
  const s = await recordMonitoringSignal(req.tenantId!, req.body);
  if (!s) { res.status(500).json({ error: "Failed to record monitoring signal" }); return; }
  setAuditData(res as any, { action: "create", entityType: "vendor_monitoring_signal", entityId: s.signal_id, afterState: s });
  emit(req, "monitoring_signal_recorded", "vendor_monitoring", s.signal_id, req.body);
  res.status(201).json(s);
}));

router.post("/auto-tier", authenticate, requirePermission("vendor.record.manage"), validate({ body: createAutotierBody }), asyncHandler(async (req, res) => {
  const result = await autoTierVendors(req.tenantId!);
  setAuditData(res as any, { action: "update", entityType: "vendor", entityId: "bulk", afterState: result });
  emit(req, "auto_tiered", "vendor", "bulk", { count: result.updated });
  res.json(result);
}));

export default router;
