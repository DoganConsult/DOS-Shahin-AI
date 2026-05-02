import { Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { emitEvent } from '../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  declareCrisis, getCrisisEvents, getCrisisById, getActiveCrises,
  updateCrisisStatus, addTimelineEntry, resolveCrisis, getCrisisDashboard,
} from '../services/crisis-management.service';
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { declareCrisisBody, updateStatusBody, timelineEntryBody, resolveCrisisBody } from "../schemas/bcp.schemas";

const router = Router();
router.use(moduleStack('bcp'));
router.use(auditMiddleware("bcp"));

const emit = (req: Request, event: string, entityType: string, entityId: string, data?: any) =>
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'bcp', event, entityType, entityId, data } as any)), { tenantId: req.tenantId!, operation: `grcEvent:bcp.${entityType}.${event}` });

// ── Dashboard & Lists (before parameterized routes) ────────────────────────

router.get("/active", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const crises = await getActiveCrises(req.tenantId!);
  res.json({ crises, count: crises.length });
}));

router.get("/dashboard", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const dashboard = await getCrisisDashboard(req.tenantId!);
  res.json(dashboard);
}));

router.get("/", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const events = await getCrisisEvents(req.tenantId!, {
    status: req.query.status as string,
    severity: req.query.severity as string,
    crisis_type: req.query.crisis_type as string,
  });
  res.json({ events, count: events.length });
}));

// ── CRUD ────────────────────────────────────────────────────────────────────

router.post("/", authenticate, requirePermission("bcp.plan.write"), validate({ body: declareCrisisBody }), asyncHandler(async (req, res) => {
  const crisis = await declareCrisis(req.tenantId!, { ...req.body, declared_by: req.user!.userId! });
  setAuditData(res as any, { action: "create", entityType: "crisis_event", entityId: crisis.event_id, afterState: crisis });
  emit(req, "crisis_declared", "crisis_event", crisis.event_id, req.body);
  res.status(201).json(crisis);
}));

router.get("/:eventId", authenticate, requirePermission("bcp.plan.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const crisis = await getCrisisById(req.tenantId!, req.params.eventId);
  if (!crisis) { res.status(404).json({ error: "Crisis event not found" }); return; }
  res.json(crisis);
}));

router.put("/:eventId", authenticate, requirePermission("bcp.plan.write"), validate({ body: updateStatusBody }), asyncHandler(async (req, res) => {
  const crisis = await updateCrisisStatus(req.tenantId!, req.params.eventId, req.body.status, {
    message: req.body.message, updated_by: req.user?.userId,
  });
  if (!crisis) { res.status(404).json({ error: "Crisis event not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "crisis_event", entityId: req.params.eventId, afterState: crisis });
  emit(req, "crisis_status_changed", "crisis_event", req.params.eventId, req.body);
  res.json(crisis);
}));

router.post("/:eventId/timeline", authenticate, requirePermission("bcp.plan.write"), validate({ body: timelineEntryBody }), asyncHandler(async (req, res) => {
  const crisis = await addTimelineEntry(req.tenantId!, req.params.eventId, {
    ...req.body, by: req.user?.userId,
  });
  if (!crisis) { res.status(404).json({ error: "Crisis event not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "crisis_event", entityId: req.params.eventId, afterState: crisis });
  res.json(crisis);
}));

router.post("/:eventId/resolve", authenticate, requirePermission("bcp.plan.write"), validate({ body: resolveCrisisBody }), asyncHandler(async (req, res) => {
  const crisis = await resolveCrisis(req.tenantId!, req.params.eventId, req.user!.userId!, req.body.post_crisis_review);
  if (!crisis) { res.status(404).json({ error: "Crisis event not found" }); return; }
  setAuditData(res as any, { action: "update", entityType: "crisis_event", entityId: req.params.eventId, afterState: crisis });
  emit(req, "crisis_resolved", "crisis_event", req.params.eventId, req.body);
  res.json(crisis);
}));

export default router;

