import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit Repeat Findings Routes
// Track and flag recurring audit findings
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listRepeatFindings,
  linkRepeatFinding,
  getRepeatHistory,
} from '../../../services/audit/findings/audit-repeat-findings.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const linkRepeatFindingBody = z.object({
  findingId: z.string().min(1),
  originalFindingId: z.string().min(1),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── List all repeat findings ───────────────────────────────────────

router.get("/", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await listRepeatFindings(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Flag a finding as repeat ───────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: linkRepeatFindingBody }), asyncHandler(async (req, res) => {
  const data = await linkRepeatFinding(req.tenantId!, req.body.findingId, req.body.originalFindingId);
  setAuditData(res as any, { action: "create", entityType: "audit_repeat_finding", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_repeat_findings', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_repeat_findings.created' });
  res.status(201).json(data);
}));

// ── Get history for a specific finding ─────────────────────────────

router.get("/:findingId/history", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getRepeatHistory(req.tenantId!, req.params.findingId);
  res.json({ items, count: items.length });
}));

export default router;

