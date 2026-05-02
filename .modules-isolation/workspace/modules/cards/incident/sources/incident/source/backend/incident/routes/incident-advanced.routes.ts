import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  getIncidentTaxonomy, createTaxonomyNode, updateTaxonomyNode,
  reportNearMiss, getNearMisses, convertNearMissToIncident,
  createPIR, getPIRs, updatePIR, signOffPIR,
  generateRegulatoryNotification, getRegulatoryReportableIncidents, markAsReported,
  getIncidentTrends, getRecurringPatterns,
  linkIncidentToRisk, getIncidentRiskImpact, autoUpdateRiskFromIncident,
} from '../services/incident/incident-advanced.service';


// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createTaxonomyBody, updateTaxonomynodeIdBody, createNearmissBody, createNearmissidConvertBody, createPirBody, updatePirpirIdBody, createPirpirIdSignoffBody, createRegulatorynotificationBody, createRegulatorynotificationIdSubmitBody, createRisklinkBody, createRiskautoupdateincidentIdBody } from "../schemas/incident.schemas";

const router = Router();
router.use(moduleStack('incident'));
router.use(auditMiddleware("incidents-advanced"));

const emit = (req: Request, event: string, entityType: string, entityId: string, data?: any) =>
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'incidents', event, entityType, entityId, data } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:incidents.any.any' });

router.get("/taxonomy", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getIncidentTaxonomy(req.tenantId!, req.query.parent_id as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/taxonomy", authenticate, requirePermission("incident.write"), validate({ body: createTaxonomyBody }), asyncHandler(async (req, res) => {
  const node = await createTaxonomyNode(req.tenantId!, req.body);
  if (!node) { res.status(500).json({ error: "Failed to create taxonomy node" }); return; }
  setAuditData(res as any, { action: "create", entityType: "incident_taxonomy", entityId: node.node_id, afterState: node });
  emit(req, "taxonomy_created", "taxonomy", node.node_id, req.body);
  res.status(201).json(node);
}));

router.put("/taxonomy/:nodeId", authenticate, requirePermission("incident.write"), validate({ body: updateTaxonomynodeIdBody }), asyncHandler(async (req, res) => {
  const node = await updateTaxonomyNode(req.tenantId!, req.params.nodeId, req.body);
  setAuditData(res as any, { action: "update", entityType: "incident_taxonomy", entityId: req.params.nodeId, afterState: node });
  emit(req, "taxonomy_updated", "taxonomy", req.params.nodeId, req.body);
  res.json(node);
}));

router.post("/near-miss", authenticate, requirePermission("incident.write"), validate({ body: createNearmissBody }), asyncHandler(async (req, res) => {
  const nm = await reportNearMiss(req.tenantId!, { ...req.body, reported_by: req.user!.userId! });
  if (!nm) { res.status(500).json({ error: "Failed to report near miss" }); return; }
  setAuditData(res as any, { action: "create", entityType: "near_miss", entityId: nm.near_miss_id, afterState: nm });
  emit(req, "near_miss_reported", "near_miss", nm.near_miss_id, req.body);
  res.status(201).json(nm);
}));

router.get("/near-miss", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getNearMisses(req.tenantId!, { status: req.query.status as string, severity: req.query.severity as string })); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/near-miss/:id/convert", authenticate, requirePermission("incident.write"), validate({ body: createNearmissidConvertBody }), asyncHandler(async (req, res) => {
  const inc = await convertNearMissToIncident(req.tenantId!, req.params.id, req.user!.userId!);
  if (!inc) { res.status(404).json({ error: "Near miss not found" }); return; }
  setAuditData(res as any, { action: "create", entityType: "incident", entityId: inc.incident_id, afterState: inc });
  emit(req, "near_miss_converted", "near_miss", req.params.id, { incidentId: inc.incident_id });
  res.json(inc);
}));

router.post("/pir", authenticate, requirePermission("incident.write"), validate({ body: createPirBody }), asyncHandler(async (req, res) => {
  const pir = await createPIR(req.tenantId!, req.body);
  if (!pir) { res.status(500).json({ error: "Failed to create PIR" }); return; }
  setAuditData(res as any, { action: "create", entityType: "incident_pir", entityId: pir.pir_id, afterState: pir });
  emit(req, "pir_created", "pir", pir.pir_id, req.body);
  res.status(201).json(pir);
}));

router.get("/pir", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getPIRs(req.tenantId!, req.query.incident_id as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.put("/pir/:pirId", authenticate, requirePermission("incident.write"), validate({ body: updatePirpirIdBody }), asyncHandler(async (req, res) => {
  const pir = await updatePIR(req.tenantId!, req.params.pirId, req.body);
  setAuditData(res as any, { action: "update", entityType: "incident_pir", entityId: req.params.pirId, afterState: pir });
  emit(req, "pir_updated", "pir", req.params.pirId, req.body);
  res.json(pir);
}));

router.post("/pir/:pirId/sign-off", authenticate, requirePermission("incident.write"), validate({ body: createPirpirIdSignoffBody }), asyncHandler(async (req, res) => {
  const so = await signOffPIR(req.tenantId!, req.params.pirId, req.user!.userId!, req.body.decision, req.body.comments);
  setAuditData(res as any, { action: "update", entityType: "incident_pir", entityId: req.params.pirId, afterState: so });
  emit(req, "pir_sign_off", "pir", req.params.pirId, { decision: req.body.decision });
  res.json(so);
}));

router.post("/regulatory-notification", authenticate, requirePermission("incident.write"), validate({ body: createRegulatorynotificationBody }), asyncHandler(async (req, res) => {
  const n = await generateRegulatoryNotification(req.tenantId!, req.body.incident_id, req.body);
  if (!n) { res.status(500).json({ error: "Failed to generate regulatory notification" }); return; }
  setAuditData(res as any, { action: "create", entityType: "incident_regulatory_notification", entityId: n.notification_id, afterState: n });
  emit(req, "regulatory_notification_created", "regulatory_notification", n.notification_id, req.body);
  res.status(201).json(n);
}));

router.get("/regulatory", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getRegulatoryReportableIncidents(req.tenantId!)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/regulatory/:notificationId/submit", authenticate, requirePermission("incident.write"), validate({ body: createRegulatorynotificationIdSubmitBody }), asyncHandler(async (req, res) => {
  const r = await markAsReported(req.tenantId!, req.params.notificationId, req.user!.userId!, req.body.reference_number);
  setAuditData(res as any, { action: "update", entityType: "incident_regulatory_notification", entityId: req.params.notificationId, afterState: r });
  emit(req, "regulatory_submitted", "regulatory_notification", req.params.notificationId, req.body);
  res.json(r);
}));

router.get("/trends", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getIncidentTrends(req.tenantId!, req.query.granularity as string)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.get("/patterns", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getRecurringPatterns(req.tenantId!)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/risk-link", authenticate, requirePermission("incident.write"), validate({ body: createRisklinkBody }), asyncHandler(async (req, res) => {
  const link = await linkIncidentToRisk(req.tenantId!, req.body.incident_id, req.body.risk_id,
  { ...req.body, linked_by: req.user!.userId! });
  setAuditData(res as any, { action: "create", entityType: "incident_risk_link", entityId: link?.link_id || req.body.incident_id, afterState: link });
  emit(req, "risk_linked", "incident", req.body.incident_id, req.body);
  res.status(201).json(link);
}));

router.get("/risk-impact/:incidentId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("incident.record.read"), async (req: Request, res: Response) => {
  try { res.json(await getIncidentRiskImpact(req.tenantId!, req.params.incidentId)); }
  catch (e: unknown) { res.status(500).json({ error: toErrorMessage(e) }); }
});

router.post("/risk-auto-update/:incidentId", authenticate, requirePermission("incident.write"), validate({ body: createRiskautoupdateincidentIdBody }), asyncHandler(async (req, res) => {
  const result = await autoUpdateRiskFromIncident(req.tenantId!, req.params.incidentId);
  setAuditData(res as any, { action: "update", entityType: "incident_risk_link", entityId: req.params.incidentId, afterState: result });
  emit(req, "risk_auto_updated", "incident", req.params.incidentId, result);
  res.json(result);
}));

export default router;
