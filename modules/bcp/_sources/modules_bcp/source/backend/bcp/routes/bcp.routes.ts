import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import {
  createBCP, getBCPPlans, getBCPById, updateBCP, scheduleDRTest, documentRecovery,
  getBCPLeadingIndicators, getBCPReadinessScore,
} from '../services/bcp.service';
import { emitEvent } from '../ports/events.port';
import { errMsg } from "../../../i18n/error-messages";
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { createBCPBody, updateBCPBody, scheduleDRTestBody, documentRecoveryBody } from "../schemas/bcp.schemas";
import { idParam } from "../../../schemas/common.schemas";

import { asyncHandler, requireOwnership, auditMiddleware, setAuditData, automationMiddleware, lifecycleGate, enforceMandatoryFields, enforceStageGates, fieldRbacFilter, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
const router = Router();
router.use(moduleStack('bcp'));
router.use(auditMiddleware("bcp"));
router.use(automationMiddleware("bcp"));
router.use(fieldRbacFilter("bcp"));
router.use(enforceMandatoryFields("bcp"));
router.use(enforceStageGates("bcp"));

// ── Analytics endpoints (must be before /:id to avoid route collision) ────

router.get("/analytics/leading-indicators", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const data = await getBCPLeadingIndicators(req.tenantId!);
  res.json(data);
}));

router.get("/analytics/readiness", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const data = await getBCPReadinessScore(req.tenantId!);
  res.json(data);
}));

router.get("/analytics/predictive", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { forecastBCPReadiness, predictRecoveryGap, estimateNextIncidentImpact } = await import('../../analytics/services/misc/predictive-analytics.service.js');
  const [forecast, recoveryGaps, incidentImpact] = await Promise.all([
  forecastBCPReadiness(req.tenantId),
  predictRecoveryGap(req.tenantId),
  estimateNextIncidentImpact(req.tenantId),
  ]);
  res.json({ forecast, recoveryGaps, incidentImpact });
}));

// ── CRUD endpoints ──────────────────────────────────────────────────────────

router.get("/", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const type = req.query.type as string | undefined;
  const plans = await getBCPPlans(req.tenantId!, type);
  res.json({ plans, count: plans.length });
}));

router.get("/:id", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const plan = await getBCPById(req.tenantId!, id);
  if (!plan) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(plan);
}));

router.post("/", authenticate, requirePermission("bcp.plan.write"), validate({ body: createBCPBody }), asyncHandler(async (req, res) => {
  const { title, type, content } = req.body;
  if (!title || !type || !content) {
  res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return;
  }
  const plan = await createBCP(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "bcp_plan", entityId: plan.plan_id, afterState: plan });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event: 'created', entityType: 'bcp_plan', entityId: plan.plan_id, data: plan } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:bcp.bcp_plan.created' });
  res.status(201).json(plan);
}));

router.put("/:id", authenticate, requirePermission("bcp.plan.write"), requireOwnership('bcp'), validate({ params: idParam, body: updateBCPBody }), lifecycleGate('bcp'), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const before = await getBCPById(req.tenantId!, id);
  const plan = await updateBCP(req.tenantId!, id, req.body);
  setAuditData(res as any, { action: "update", entityType: "bcp_plan", entityId: id, beforeState: before, afterState: plan });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event: 'updated', entityType: 'bcp_plan', entityId: id, data: plan, previousData: before } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:bcp.bcp_plan.updated' });
  res.json(plan);
}));

router.post("/:id/dr-test", authenticate, requirePermission("bcp.plan.write"), requireOwnership('bcp'), validate({ params: idParam, body: scheduleDRTestBody }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { testDate, testType } = req.body;
  if (!testDate || !testType) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const plan = await scheduleDRTest(req.tenantId!, id, req.body);
  setAuditData(res as any, { action: "update", entityType: "bcp_dr_test", entityId: id, afterState: plan });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event: 'dr_test_scheduled', entityType: 'bcp_plan', entityId: id, data: plan } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:bcp.bcp_plan.dr_test_scheduled' });
  res.json(plan);
}));

router.post("/:id/recovery", authenticate, requirePermission("bcp.plan.write"), requireOwnership('bcp'), validate({ params: idParam, body: documentRecoveryBody }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const { testDate, result } = req.body;
  if (!testDate || !result) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const plan = await documentRecovery(req.tenantId!, id, req.body);
  setAuditData(res as any, { action: "update", entityType: "bcp_recovery", entityId: id, afterState: plan });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event: 'recovery_documented', entityType: 'bcp_plan', entityId: id, data: plan } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:bcp.bcp_plan.recovery_documented' });
  res.json(plan);
}));

// DELETE /:id — Soft-delete a BCP plan
router.delete("/:id", authenticate, requirePermission("bcp.plan.write"), requireOwnership('bcp'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const id = req.params.id as string;
  const before = await getBCPById(req.tenantId!, id);
  if (!before) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  await updateBCP(req.tenantId!, id, { status: 'archived' });
  setAuditData(res as any, { action: "delete", entityType: "bcp_plan", entityId: id, beforeState: before });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event: 'deleted', entityType: 'bcp_plan', entityId: id, previousData: before } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:bcp.bcp_plan.deleted' });
  res.json({ message: "BCP plan deleted", plan_id: id });
}));

export default router;

