import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit Team Routes
// Manage audit team assignments and workload
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getTeam,
  assignMember,
  removeMember,
  updateHours,
  getWorkloadSummary,
} from '../../../services/audit/planning/audit-team.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const assignMemberBody = z.object({
  auditId: z.string().min(1),
  userId: z.string().min(1),
  role: z.string().min(1),
}).passthrough();

const updateHoursBody = z.object({
  hoursActual: z.number(),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── List team members for an audit ─────────────────────────────────

router.get("/audit/:auditId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getTeam(req.tenantId!, req.params.auditId);
  res.json({ items, count: items.length });
}));

// ── Add team member ────────────────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: assignMemberBody }), asyncHandler(async (req, res) => {
  const data = await assignMember(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "audit_team_member", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_team', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_team.created' });
  res.status(201).json(data);
}));

// ── Remove team member ─────────────────────────────────────────────

router.delete("/:id", authenticate, requirePermission("audit.record.manage"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const deleted = await removeMember(req.tenantId!, req.params.id);
  if (!deleted) { res.status(404).json({ error: "Not found" }); return; }
  setAuditData(res as any, { action: "delete", entityType: "audit_team_member", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'deleted', entityType: 'audit_team', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_team.deleted' });
  res.json({ deleted: true, id: req.params.id });
}));

// ── Update member hours ────────────────────────────────────────────

router.put("/:id/hours", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updateHoursBody }), asyncHandler(async (req, res) => {
  const data = await updateHours(req.tenantId!, req.params.id, req.body.hoursActual);
  setAuditData(res as any, { action: "update", entityType: "audit_team_member", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_team', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_team.updated' });
  res.json(data);
}));

// ── Get workload across all audits ─────────────────────────────────

router.get("/workload", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getWorkloadSummary(req.tenantId!);
  res.json({ items, count: items.length });
}));

export default router;

