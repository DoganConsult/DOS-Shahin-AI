import { Request, Response, Router } from 'express';

import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Evidence Reviews Routes — Review submissions, accept/reject/needs_revision
// Two routers exported:
//   reviewsListRouter — mounted at /reviews  (GET /api/evidence/reviews)
//   reviewSubmitRouter — mounted at /        (POST /api/evidence/:id/review)
// ============================================

import { authenticate, requirePermission } from '../../ports/auth.port';
import { emitEvent, notifyDomainChange } from '../../ports/events.port';
import { recordActivity } from '../../ports/platform.port';
import {
  getEvidenceReviews,
  createEvidenceReview,
} from '../../services/core/evidence.service';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { errMsg } from "../../../../i18n/error-messages";
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { setAuditData, validate } from '../../ports/middleware.port';
import { idParam } from "../../../../schemas/common.schemas";
import { createReviewBody } from "../../schemas/evidence.schemas";

/** Mounted at /reviews — serves GET /api/evidence/reviews */
export const reviewsListRouter = Router();

// GET /api/evidence/reviews — List evidence reviews
reviewsListRouter.get("/", authenticate, requirePermission("evidence.item.read"), async (req: Request, res: Response) => {
  const tenantId = req.user!.tenantId!;
  const { status, evidenceId } = req.query;
  const reviews = await getEvidenceReviews(tenantId, {
  status: status as string | undefined,
  evidenceId: evidenceId as string | undefined,
  });
  res.json({ reviews, count: reviews.length });
});

/** Mounted at / — serves POST /api/evidence/:id/review */
export const reviewSubmitRouter = Router();

// POST /api/evidence/:id/review — Submit a review (accept/reject/needs_revision)
reviewSubmitRouter.post("/:id/review", authenticate, requirePermission("evidence.item.write"), validate({ params: idParam, body: createReviewBody }), async (req: Request, res: Response) => {
  try {
  const tenantId = req.user!.tenantId!;
  const userId = req.user!.userId!;
  const { outcome, reviewType, comments } = req.body;
  if (!outcome) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const schema = tenantSchema(tenantId);
  const evidenceRow = await safeQuery(
  `SELECT submitted_by, created_by, owner_user_id FROM "${schema}".evidence WHERE evidence_id = $1`,
  [req.params.id]
  );
  if (evidenceRow.rows.length > 0) {
  const ev = getFirstRow(evidenceRow)!;
  const isSubmitter = (ev.submitted_by && ev.submitted_by === userId) || (ev.created_by && ev.created_by === userId);
  const isOwner = ev.owner_user_id && ev.owner_user_id === userId;
  if (isSubmitter || isOwner) {
  res.status(403).json({
  error: `Separation of Duties: reviewer cannot be the evidence submitter/owner.`,
  sodViolation: true,
  conflictRole: isSubmitter ? 'submitter' : 'owner',
  });
  return;
  }
  }
  const review = await createEvidenceReview(tenantId, req.params.id, {
  reviewerId: userId, outcome, reviewType, comments,
  });

  setAuditData(res as any, { action: "create", entityType: "evidence_review", entityId: review.review_id, afterState: review });

  emitEvent(({ tenantId, userId, module: 'evidence', event: 'reviewed', entityType: 'evidence', entityId: req.params.id, data: { outcome, reviewId: review.review_id } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  notifyDomainChange(tenantId, 'evidence', 'update', req.params.id);
  try { await recordActivity(tenantId, { userId, module: 'evidence', action: 'update' as any, entityType: 'evidence', entityId: req.params.id, summary: `Evidence ${outcome}`, changes: { outcome } }); } catch { }
  res.status(201).json(review);
  } catch (err: unknown) {
  const status = toErrorMessage(err).includes('not found') ? 404 : toErrorMessage(err).includes('Invalid outcome') ? 400 : 500;
  res.status(status).json({ error: status === 404 ? errMsg('EVIDENCE_NOT_FOUND', req) : status === 400 ? errMsg('INVALID_INPUT', req) : errMsg('INTERNAL_ERROR', req) });
  }
});

// Default export for backward compatibility
export default reviewsListRouter;
