import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import {
  issueVendorPortalToken, validateVendorToken, revokeVendorToken,
  submitVendorQuestionnaire, getVendorSubmissions, reviewVendorSubmission,
} from '../services/vendor/vendor-portal.service';
import { emptyResult } from '../ports/database.port';
import { emitEvent } from '../ports/events.port';
import { createVendorMessage, listVendorMessages, markVendorMessageRead } from '../services/vendor/vendor-enhancements.service';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../ports/platform.port';
import { getFirstRow } from '@dos/db';
// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, validate, moduleStack } from '../ports/middleware.port';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience';
import type { GenericRow as _GenericRow } from '@dos/types';
import { createTokenBody, createValidateBody, createSubmissionsBody, createSubmissionssubmissionIdReviewBody, updateVendorIdProfileBody, createVendorIdQuestionnairesqidRespondBody, updateVendorIdActionitemsitemIdBody, createVendorIdDocumentsBody, createVendorIdMessagesBody, patchVendorIdMessagesmessageIdReadBody } from "../schemas/vendor.schemas";

const router = Router();
router.use(moduleStack('vendor'));
router.use(auditMiddleware("vendors"));

/**
 * @openapi
 * /vendors/portal/token:
 *   post:
 *     tags: [Vendors]
 *     summary: Issue a vendor portal access token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               vendorId: { type: string }
 *               expiresInDays: { type: integer, default: 30 }
 *               scope: { type: array, items: { type: string } }
 */
router.post('/token', authenticate, requirePermission('vendor.record.manage'), validate({ body: createTokenBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const result = await issueVendorPortalToken(tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'vendor_portal_token', entityId: result.tokenId, afterState: { tokenId: result.tokenId, vendorId: req.body.vendorId } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'vendors', event: 'created', entityType: 'vendor_portal_token', entityId: result.tokenId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_portal_token.created' });
  res.status(201).json(result);
}));

router.delete('/token/:tokenId', authenticate, requirePermission('vendor.record.manage'), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  await revokeVendorToken(tenantId, req.params.tokenId);
  setAuditData(res as any, { action: 'delete', entityType: 'vendor_portal_token', entityId: req.params.tokenId });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'vendors', event: 'deleted', entityType: 'vendor_portal_token', entityId: req.params.tokenId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_portal_token.deleted' });
  res.json({ success: true });
}));

/**
 * @openapi
 * /vendors/portal/validate:
 *   post:
 *     tags: [Vendors]
 *     summary: Validate a vendor portal token (public endpoint for external vendors)
 *     security: [{vendorToken: []}]
 */
router.post('/validate', validate({ body: createValidateBody }), asyncHandler(async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const token = req.headers['x-vendor-token'] as string || req.body.token;
  if (!tenantId || !token) return res.status(400).json({ error: 'tenantId and token required' }) as unknown;
  const result = await validateVendorToken(tenantId, token);
  res.json(result);
}));

/**
 * @openapi
 * /vendors/portal/submissions:
 *   post:
 *     tags: [Vendors]
 *     summary: Submit vendor questionnaire (external vendor endpoint)
 *     security: [{vendorToken: []}]
 */
router.post('/submissions', validate({ body: createSubmissionsBody }), asyncHandler(async (req, res) => {
  const tenantId = req.headers['x-tenant-id'] as string;
  const token = req.headers['x-vendor-token'] as string;
  if (!tenantId || !token) return res.status(401).json({ error: 'Vendor token required' }) as unknown;

  const validation = await validateVendorToken(tenantId, token);
  if (!validation.valid) return res.status(401).json({ error: 'Invalid or expired token' }) as unknown;

  const result = await submitVendorQuestionnaire(tenantId, {
  ...req.body,
  vendorId: validation.vendorId!,
  tokenId: validation.tokenId!,
  });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: validation.vendorId || 'external', module: 'vendors', event: 'created', entityType: 'vendor_questionnaire_submission', entityId: result.submissionId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_questionnaire_submission.created' });
  res.status(201).json(result);
}));

router.get('/submissions/:vendorId', authenticate, requirePermission('vendor.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const data = await getVendorSubmissions(tenantId, req.params.vendorId);
  res.json({ data });
}));

router.post('/submissions/:submissionId/review', authenticate, requirePermission('vendor.record.write'), validate({ body: createSubmissionssubmissionIdReviewBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const reviewerId = req.user!.userId!;
  await reviewVendorSubmission(tenantId, { submissionId: req.params.submissionId, reviewerId, ...req.body });
  setAuditData(res as any, { action: 'update', entityType: 'vendor_questionnaire_submission', entityId: req.params.submissionId, afterState: { reviewed: true } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: reviewerId, module: 'vendors', event: 'updated', entityType: 'vendor_questionnaire_submission', entityId: req.params.submissionId } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:vendors.vendor_questionnaire_submission.updated' });
  res.json({ success: true });
}));

async function resolveVendorToken(req: Request, res: Response): Promise<{ tenantId: string; vendorId: string } | null> {
  const tenantId = req.headers['x-tenant-id'] as string || req.tenantId;
  const token = (req.headers['authorization'] as string || '').replace('Bearer ', '') || req.headers['x-vendor-token'] as string;
  if (!tenantId || !token) { res.status(401).json({ error: 'Vendor authentication required' }); return null; }
  const result = await validateVendorToken(tenantId, token);
  if (!result.valid || !result.vendorId) { res.status(401).json({ error: 'Invalid or expired token' }); return null; }
  return { tenantId, vendorId: result.vendorId };
}

router.get('/:vendorId/profile', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(ctx.tenantId);
  const r = await safeQuery(`SELECT vendor_id AS "vendorId", name, category, risk_tier AS "riskTier", status FROM "${schema}".vendors WHERE vendor_id = $1`, [ctx.vendorId]);
  if (!getFirstRow(r)) return res.status(404).json({ error: 'Vendor not found' }) as unknown;
  res.json(getFirstRow(r));
}));

router.put('/:vendorId/profile', validate({ body: updateVendorIdProfileBody }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(ctx.tenantId);
  await safeQuery(`UPDATE "${schema}".vendors SET name = COALESCE($1, name), category = COALESCE($2, category), updated_at = NOW() WHERE vendor_id = $3`, [req.body.name || null, req.body.industry || null, ctx.vendorId]);
  const r = await safeQuery(`SELECT vendor_id AS "vendorId", name, category, risk_tier AS "riskTier", status FROM "${schema}".vendors WHERE vendor_id = $1`, [ctx.vendorId]);
  res.json(getFirstRow(r) || {});
}));

router.get('/:vendorId/questionnaires', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const data = await getVendorSubmissions(ctx.tenantId, ctx.vendorId);
  res.json({ questionnaires: data, count: data.length });
}));

router.get('/:vendorId/questionnaires/:qid', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const data = await getVendorSubmissions(ctx.tenantId, ctx.vendorId);
  const q = data.find((d: Record<string, unknown>) => d.submission_id === req.params.qid || d.questionnaire_id === req.params.qid);
  if (!q) return res.status(404).json({ error: 'Questionnaire not found' }) as unknown;
  res.json(q);
}));

router.post('/:vendorId/questionnaires/:qid/respond', validate({ body: createVendorIdQuestionnairesqidRespondBody }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const tenantId = ctx.tenantId;
  const token = (req.headers['authorization'] as string || '').replace('Bearer ', '') || req.headers['x-vendor-token'] as string;
  const validation = await validateVendorToken(tenantId, token);
  const result = await submitVendorQuestionnaire(tenantId, { vendorId: ctx.vendorId, questionnaireId: req.params.qid, tokenId: validation.tokenId!, answers: req.body.responses || {}, submit: true });
  res.json({ submitted: true, submissionId: result.submissionId });
}));

router.get('/:vendorId/action-items', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(ctx.tenantId);
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT finding_id AS "actionItemId", title, description, severity AS priority, status, due_date AS "dueDate", created_at AS "createdAt" FROM "${schema}".vendor_findings WHERE vendor_id = $1 AND status IN ('open','in_progress') ORDER BY created_at DESC`, [ctx.vendorId]), { tenantId: req.tenantId!, operation: 'query vendor_findings' });
  res.json({ actionItems: r.rows, count: r.rows.length });
}));

router.put('/:vendorId/action-items/:itemId', validate({ body: updateVendorIdActionitemsitemIdBody }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(ctx.tenantId);
  const newStatus = req.body.status;
  if (newStatus) {
  const enforcement = await enforceStatusTransition(ctx.tenantId, {
  moduleCode: 'vendor', table: 'vendor_findings', idColumn: 'finding_id',
  entityId: req.params.itemId, toStatus: newStatus, actorUserId: ctx.vendorId || 'vendor',
  });
  if ((enforcement as unknown as Record<string, unknown>).blocked) return res.status(403).json({ error: 'Transition denied', reason: (enforcement as unknown as Record<string, unknown>).reason }) as unknown;
  if ((enforcement as unknown as Record<string, unknown>).pendingApproval) return res.status(202).json({ pendingApproval: true, approvalId: (enforcement as unknown as Record<string, unknown>).approvalId }) as unknown;
  }
  if (!newStatus) {
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`UPDATE "${schema}".vendor_findings SET updated_at = NOW() WHERE finding_id = $1 AND vendor_id = $2 RETURNING *`, [req.params.itemId, ctx.vendorId]), { tenantId: req.tenantId!, operation: 'update vendor_findings' });
  if (!getFirstRow(r)) return res.status(404).json({ error: 'Action item not found' }) as unknown;
  return res.json(getFirstRow(r));
  }
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".vendor_findings WHERE finding_id = $1 AND vendor_id = $2`, [req.params.itemId, ctx.vendorId]), { tenantId: req.tenantId!, operation: 'query vendor_findings' });
  if (!getFirstRow(r)) return res.status(404).json({ error: 'Action item not found' }) as unknown;
  res.json(getFirstRow(r));
}));

router.get('/:vendorId/documents', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(ctx.tenantId);
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT document_id AS "documentId", title AS "fileName", document_type AS "fileType", file_size_bytes AS "fileSize", uploaded_by AS "uploadedBy", created_at AS "createdAt" FROM "${schema}".vendor_documents WHERE vendor_id = $1 ORDER BY created_at DESC`, [ctx.vendorId]), { tenantId: req.tenantId!, operation: 'query vendor_documents' });
  res.json({ documents: r.rows, count: r.rows.length });
}));

router.post('/:vendorId/documents', validate({ body: createVendorIdDocumentsBody }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(ctx.tenantId);
  const r = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`INSERT INTO "${schema}".vendor_documents (vendor_id, title, document_type, file_size_bytes) VALUES ($1, $2, $3, $4) RETURNING document_id AS "documentId", title AS "fileName", document_type AS "fileType"`, [ctx.vendorId, req.body.fileName || 'untitled', req.body.fileType || 'general', req.body.fileSize || 0]), { tenantId: req.tenantId!, operation: 'insert vendor_documents' });
  res.status(201).json(getFirstRow(r) || { success: true });
}));

router.get('/:vendorId/compliance-status', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const { safeQuery, tenantSchema } = await import('../../../config/database.js');
  const schema = tenantSchema(ctx.tenantId);
  const v = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT risk_score, risk_tier, assessment_score FROM "${schema}".vendors WHERE vendor_id = $1`, [ctx.vendorId]), { tenantId: req.tenantId!, operation: 'query vendors' });
  const vendor = getFirstRow(v) || {};
  const subs = await getVendorSubmissions(ctx.tenantId, ctx.vendorId);
  const openQ = subs.filter((s: Record<string, unknown>) => s.status === 'draft' || s.status === 'submitted').length;
  res.json({ overallScore: vendor.risk_score || 0, frameworkCoverage: 0, openQuestionnaires: openQ, pendingActionItems: 0, engagementScore: 0, riskTier: vendor.risk_tier || 'medium', lastAssessmentDate: null });
}));

router.get('/:vendorId/messages', validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  const messages = await listVendorMessages(ctx.tenantId, ctx.vendorId, {
  senderType: req.query.senderType as string | undefined,
  unreadOnly: req.query.unreadOnly === 'true',
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  });
  res.json({ messages, count: messages.length });
}));

router.post('/:vendorId/messages', validate({ body: createVendorIdMessagesBody }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  if (!req.body.subject || !req.body.body) {
  return res.status(400).json({ error: 'subject and body are required' }) as unknown;
  }
  const message = await createVendorMessage(
  ctx.tenantId, ctx.vendorId,
  req.body.senderId || ctx.vendorId,
  req.body.senderType || 'vendor',
  req.body.subject,
  req.body.body,
  req.body.parentMessageId,
  );
  res.status(201).json(message);
}));

router.patch('/:vendorId/messages/:messageId/read', validate({ body: patchVendorIdMessagesmessageIdReadBody }), asyncHandler(async (req, res) => {
  const ctx = await resolveVendorToken(req, res);
  if (!ctx) return;
  await markVendorMessageRead(ctx.tenantId, req.params.messageId);
  res.json({ success: true });
}));

export default router;
