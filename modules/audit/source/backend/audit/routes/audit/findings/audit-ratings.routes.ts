import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit Ratings Routes
// Audit opinion / rating management
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  getRating,
  setRating,
  getRatingsSummary,
} from '../../../services/audit/reporting/audit-ratings.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const setRatingBody = z.object({
  auditId: z.string().min(1),
  rating: z.string().min(1),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── Get ratings for an audit ───────────────────────────────────────

router.get("/audit/:auditId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getRating(req.tenantId!, req.params.auditId);
  res.json({ items, count: items.length });
}));

// ── Create rating ──────────────────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: setRatingBody }), asyncHandler(async (req, res) => {
  const data = await setRating(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "audit_rating", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_ratings', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_ratings.created' });
  res.status(201).json(data);
}));

// ── Get rating summary across all audits ───────────────────────────

router.get("/summary", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const result = await getRatingsSummary(req.tenantId!);
  res.json(result);
}));

export default router;

