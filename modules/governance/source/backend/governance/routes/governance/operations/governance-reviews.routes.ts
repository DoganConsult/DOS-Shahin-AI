import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listReviews, getReviewQueue, getOverdueReviews,
  getReviewById, createReview, updateReview, softDeleteReview,
} from '../../../services/governance/governance-reviews.service';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';

/** Zod schemas for request body validation */
const createReviewBody = z.object({}).passthrough();

const updateReviewBody = z.object({}).passthrough();

const completeReviewBody = z.object({
  outcome: z.string().min(1),
  comments: z.string().optional(),
  next_review_date: z.string().optional(),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, EC } from '../../../ports/resilience.port';
import { genericGovernanceSchema } from "../../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { policy_id, reviewer_id, review_type, outcome } = req.query;
  const rows = await listReviews(req.tenantId, {
  policy_id: policy_id as string,
  reviewer_id: reviewer_id as string,
  review_type: review_type as string,
  outcome: outcome as string,
  });
  res.json({ reviews: rows, count: rows.length });
}));

router.get('/queue', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getReviewQueue(req.tenantId);
  res.json({ queue: rows, count: rows.length });
}));

router.get('/overdue', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await getOverdueReviews(req.tenantId);
  res.json({ reviews: rows, count: rows.length });
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const result = await getReviewById(req.tenantId, req.params.id);
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createReviewBody }), asyncHandler(async (req, res) => {
  const result = await createReview(req.tenantId, {
  ...req.body,
  created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_review', entityId: result?.review_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_review', entityId: result?.review_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_review.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateReviewBody }), asyncHandler(async (req, res) => {
  try {
  const result = await updateReview(req.tenantId, req.params.id, {
  ...req.body,
  updated_by: req.user?.userId,
  });
  setAuditData(res as any, { action: 'update', entityType: 'governance_review', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_review', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_review.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.post('/:id/complete', authenticate, requirePermission('governance.record.write'), validate({ body: completeReviewBody }), asyncHandler(async (req, res) => {
  try {
  const { outcome, comments, next_review_date } = req.body;
  if (!outcome) return res.status(400).json({ error: 'outcome is required' });
  const result = await updateReview(req.tenantId, req.params.id, {
  outcome,
  comments,
  next_review_date,
  status: 'completed',
  completed_at: new Date().toISOString(),
  completed_by: req.user?.userId,
  updated_by: req.user?.userId,
  });
  setAuditData(res as any, { action: 'update', entityType: 'governance_review', entityId: req.params.id, afterState: { status: 'completed', outcome } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_review', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_review.updated' });
  res.json(result);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : 500;
  res.status(status).json({ error: toErrorMessage(err) });
  }
}));

router.delete('/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const deleted = await softDeleteReview(req.tenantId, req.params.id, req.user?.userId);
  if (!deleted) return res.status(404).json({ error: 'Review not found' });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_review', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_review', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_review.deleted' });
  res.json({ deleted: true });
}));

export default router;

