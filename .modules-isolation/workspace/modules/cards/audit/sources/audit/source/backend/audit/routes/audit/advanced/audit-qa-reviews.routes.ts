import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit QA Reviews Routes
// Quality assurance review workflow for audits
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listReviews,
  createReview,
  approveReview,
  rejectReview,
  getPendingReviews,
} from '../../../services/audit/reporting/audit-qa-reviews.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createQaReviewBody = z.object({
  auditId: z.string().min(1),
  reviewType: z.string().min(1),
}).passthrough();

const rejectReviewBody = z.object({
  comments: z.string().optional(),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── List QA reviews for an audit ───────────────────────────────────

router.get("/audit/:auditId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await listReviews(req.tenantId!, req.params.auditId);
  res.json({ items, count: items.length });
}));

// ── Get pending reviews ────────────────────────────────────────────

router.get("/pending", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await getPendingReviews(req.tenantId!);
  res.json({ items, count: items.length });
}));

// ── Create QA review ───────────────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createQaReviewBody }), asyncHandler(async (req, res) => {
  const data = await createReview(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "audit_qa_review", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_qa_reviews', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_qa_reviews.created' });
  res.status(201).json(data);
}));

// ── Approve QA review ──────────────────────────────────────────────

router.put("/:id/approve", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const data = await approveReview(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: "update", entityType: "audit_qa_review", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_qa_reviews', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_qa_reviews.updated' });
  res.json(data);
}));

// ── Reject QA review ───────────────────────────────────────────────

router.put("/:id/reject", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: rejectReviewBody }), asyncHandler(async (req, res) => {
  const data = await rejectReview(req.tenantId!, req.params.id, req.body.comments);
  setAuditData(res as any, { action: "update", entityType: "audit_qa_review", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_qa_reviews', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_qa_reviews.updated' });
  res.json(data);
}));

export default router;

