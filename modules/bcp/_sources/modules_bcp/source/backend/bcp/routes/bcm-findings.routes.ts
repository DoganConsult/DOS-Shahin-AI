import { Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  createFinding, getFindings, getFindingById, updateFinding,
  verifyFinding, closeFinding, getFindingsSummary,
} from '../services/bcm-findings.service';
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createFindingBody, updateFindingBody, createVerifyBody, createCloseBody } from "../schemas/bcp.schemas";

const router = Router();
router.use(moduleStack('bcp'));
router.use(auditMiddleware("bcp"));

const emit = (req: Request, event: string, entityType: string, entityId: string, data?: any) =>
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event, entityType, entityId, data } as any)), { tenantId: req.tenantId!, operation: `grcEvent:bcp.${entityType}.${event}` });

// ── Summary (before parameterized routes) ──────────────────────────────────

router.get("/summary", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const summary = await getFindingsSummary(req.tenantId!);
  res.json(summary);
}));

// ── CRUD ────────────────────────────────────────────────────────────────────

router.get("/", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const findings = await getFindings(req.tenantId!, {
    status: req.query.status as string,
    severity: req.query.severity as string,
    source_type: req.query.source_type as string,
    assigned_to: req.query.assigned_to as string,
  });
  res.json({ findings, count: findings.length });
}));

router.get("/:findingId", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const finding = await getFindingById(req.tenantId!, req.params.findingId);
  if (!finding) { res.status(404).json({ error: "Finding not found" }); return; }
  res.json(finding);
}));

router.post("/", authenticate, requirePermission("bcp.plan.write"), validate({ body: createFindingBody }), asyncHandler(async (req, res) => {
  const finding = await createFinding(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "bcm_finding", entityId: finding.finding_id, afterState: finding });
  emit(req, "finding_created", "bcm_finding", finding.finding_id, req.body);
  res.status(201).json(finding);
}));

router.put("/:findingId", authenticate, requirePermission("bcp.plan.write"), validate({ body: updateFindingBody }), asyncHandler(async (req, res) => {
  const before = await getFindingById(req.tenantId!, req.params.findingId);
  const finding = await updateFinding(req.tenantId!, req.params.findingId, req.body);
  if (!finding) { res.status(404).json({ error: "Finding not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "bcm_finding", entityId: req.params.findingId, beforeState: before, afterState: finding });
  emit(req, "finding_updated", "bcm_finding", req.params.findingId, req.body);
  res.json(finding);
}));

router.post("/:findingId/verify", authenticate, requirePermission("bcp.plan.write"), validate({ body: createVerifyBody }), asyncHandler(async (req, res) => {
  const finding = await verifyFinding(req.tenantId!, req.params.findingId, req.user!.userId!);
  if (!finding) { res.status(404).json({ error: "Finding not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "bcm_finding", entityId: req.params.findingId, afterState: finding });
  emit(req, "finding_verified", "bcm_finding", req.params.findingId);
  res.json(finding);
}));

router.post("/:findingId/close", authenticate, requirePermission("bcp.plan.write"), validate({ body: createCloseBody }), asyncHandler(async (req, res) => {
  const finding = await closeFinding(req.tenantId!, req.params.findingId);
  if (!finding) { res.status(404).json({ error: "Finding not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "bcm_finding", entityId: req.params.findingId, afterState: finding });
  emit(req, "finding_closed", "bcm_finding", req.params.findingId);
  res.json(finding);
}));

export default router;

