import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Audit Working Papers Routes
// CRUD + review workflow for working papers
// ============================================
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listPapers,
  createPaper,
  updatePaper,
  submitForReview,
  approvePaper,
} from '../../../services/audit/execution/audit-working-papers.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';

// ── Zod Schemas ──────────────────────────────────────────────────────
const createPaperBody = z.object({
  auditId: z.string().min(1),
  title: z.string().min(1),
}).passthrough();

const updatePaperBody = z.object({}).passthrough();

const submitForReviewBody = z.object({
  reviewerId: z.string().min(1),
}).passthrough();

const idParam = z.object({ id: z.string().min(1) });

import { asyncHandler, validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';

const router = Router();
router.use(moduleStack('audit'));
router.use(auditMiddleware("audit"));
router.use(automationMiddleware("audit"));

// ── List working papers for an audit ───────────────────────────────

router.get("/audit/:auditId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const items = await listPapers(req.tenantId!, req.params.auditId);
  res.json({ items, count: items.length });
}));

// ── Create working paper ───────────────────────────────────────────

router.post("/", authenticate, requirePermission("audit.record.manage"), validate({ body: createPaperBody }), asyncHandler(async (req, res) => {
  const data = await createPaper(req.tenantId!, req.body);
  setAuditData(res as any, { action: "create", entityType: "audit_working_paper", entityId: data.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_working_papers', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_working_papers.created' });
  res.status(201).json(data);
}));

// ── Update working paper ───────────────────────────────────────────

router.put("/:id", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: updatePaperBody }), asyncHandler(async (req, res) => {
  const data = await updatePaper(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "audit_working_paper", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'updated', entityType: 'audit_working_papers', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_working_papers.updated' });
  res.json(data);
}));

// ── Submit for review ──────────────────────────────────────────────

router.post("/:id/submit-review", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam, body: submitForReviewBody }), asyncHandler(async (req, res) => {
  const data = await submitForReview(req.tenantId!, req.params.id, req.body.reviewerId);
  setAuditData(res as any, { action: "update", entityType: "audit_working_paper", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_working_papers', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_working_papers.created' });
  res.json(data);
}));

// ── Approve working paper ──────────────────────────────────────────

router.post("/:id/approve", authenticate, requirePermission("audit.record.manage"), validate({ params: idParam }), asyncHandler(async (req, res) => {
  const data = await approvePaper(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: "update", entityType: "audit_working_paper", entityId: req.params.id, afterState: data });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'audit', event: 'created', entityType: 'audit_working_papers', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:audit.audit_working_papers.created' });
  res.json(data);
}));

export default router;

