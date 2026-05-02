import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit Schedules Routes
// CRUD + toggle + due-list for audit schedules
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  toggleSchedule,
  getDueSchedules,
  triggerEvidenceForSchedule,
} from '../../../services/audit/planning/audit-schedules.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createScheduleBody = z.object({
  title: z.string().min(1),
  cronExpression: z.string().min(1),
}).passthrough();

const updateScheduleBody = z.object({}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── List all schedules ─────────────────────────────────────────────

router.get("/", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await listSchedules(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Get due schedules ──────────────────────────────────────────────

router.get("/due", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getDueSchedules(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Create schedule ────────────────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createScheduleBody }), asyncHandler(async (req, res) => {
  const data = await createSchedule(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "audit_schedule", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_schedules', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_schedules.created' });
  res.status(201).json(data);
}));

// ── Update schedule ────────────────────────────────────────────────

router.put("/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updateScheduleBody }), asyncHandler(async (req, res) => {
  const data = await updateSchedule(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "audit_schedule", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_schedules', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_schedules.updated' });
  res.json(data);
}));

// ── Delete schedule ────────────────────────────────────────────────

router.delete("/:id", authenticate, requirePermission("audit.record.manage"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const deleted = await deleteSchedule(req.tenantId!, req.params.id);
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "audit_schedule", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'deleted', entityType: 'audit_schedules', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_schedules.deleted' });
  res.json({ deleted: true, id: req.params.id });
}));

// ── Toggle schedule active/inactive ────────────────────────────────

router.post("/:id/toggle", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const data = await toggleSchedule(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: "update", entityType: "audit_schedule", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_schedules', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_schedules.created' });
  res.json(data);
}));

// ── Trigger evidence collection for a schedule ──────────────────────

router.post("/:id/trigger-evidence", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const result = await triggerEvidenceForSchedule(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: "create", entityType: "evidence_request", afterState: result });
  res.json(result);
}));

export default router;

