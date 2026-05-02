// ============================================
// F09: Vendor Portal Service
// Token-based external vendor access for
// questionnaire submission and assessment.
// Bridges TPRM completeness gap vs IBM/SN.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';

export async function issueVendorPortalToken(tenantId: string, params: {
  vendorId: string;
  expiresInDays?: number;
  scope?: string[];
}): Promise<{ token: string; tokenId: string; expiresAt: Date }> {
  const schema = tenantSchema(tenantId);
  const token = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const tokenId = uuid();
  const expiresAt = new Date(Date.now() + (params.expiresInDays ?? 30) * 24 * 60 * 60 * 1000);

  await safeQuery(
    `INSERT INTO "${schema}".vendor_portal_tokens
     (token_id, vendor_id, token_hash, scope, expires_at)
     VALUES ($1, $2, $3, $4, $5)`,
    [tokenId, params.vendorId, tokenHash,
     JSON.stringify(params.scope ?? ['questionnaire.form.read', 'questionnaire.form.submit']),
     expiresAt],
  );

  eventBus.publish(({
      eventType: 'vendor.portal_token_issued',
      tenantId,
      sourceService: 'VendorPortalService',
      severity: 'info',
      entityType: 'vendor',
      entityId: params.vendorId,
      payload: { tokenId, expiresAt },
    } as any));

  return { token, tokenId, expiresAt };
}

export async function validateVendorToken(tenantId: string, token: string): Promise<{
  valid: boolean;
  vendorId?: string;
  tokenId?: string;
  scope?: string[];
}> {
  const schema = tenantSchema(tenantId);
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

  const res = await safeQuery(
    `UPDATE "${schema}".vendor_portal_tokens SET last_used_at = NOW()
     WHERE token_hash = $1 AND revoked = false AND expires_at > NOW()
     RETURNING token_id, vendor_id, scope`,
    [tokenHash],
  );

  if (!getFirstRow(res)) return { valid: false };
  const row = getFirstRow(res)!;
  return {
    valid: true,
    vendorId: row.vendor_id,
    tokenId: row.token_id,
    scope: typeof row.scope === 'string' ? JSON.parse(row.scope) : row.scope,
  };
}

export async function revokeVendorToken(tenantId: string, tokenId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".vendor_portal_tokens SET revoked = true WHERE token_id = $1`,
    [tokenId],
  );
}

export async function submitVendorQuestionnaire(tenantId: string, params: {
  vendorId: string;
  questionnaireId: string;
  tokenId: string;
  answers: Record<string, unknown>;
  submit?: boolean;
}): Promise<{ submissionId: string }> {
  const schema = tenantSchema(tenantId);
  const submissionId = uuid();

  await safeQuery(
    `INSERT INTO "${schema}".vendor_questionnaire_submissions
     (submission_id, vendor_id, questionnaire_id, token_id, answers, status, submitted_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (submission_id) DO UPDATE SET answers = EXCLUDED.answers, status = EXCLUDED.status`,
    [submissionId, params.vendorId, params.questionnaireId, params.tokenId,
     JSON.stringify(params.answers),
     params.submit ? 'submitted' : 'draft',
     params.submit ? new Date() : null],
  );

  if (params.submit) {
    eventBus.publish(({
          eventType: 'vendor.questionnaire_submitted',
          tenantId,
          sourceService: 'VendorPortalService',
          severity: 'info',
          entityType: 'vendor',
          entityId: params.vendorId,
          payload: { submissionId, questionnaireId: params.questionnaireId },
        } as any));
  }

  return { submissionId };
}

export async function getVendorSubmissions(tenantId: string, vendorId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".vendor_questionnaire_submissions
     WHERE vendor_id = $1 ORDER BY created_at DESC`,
    [vendorId],
  );
  return res.rows;
}

export async function reviewVendorSubmission(tenantId: string, params: {
  submissionId: string;
  reviewerId: string;
  notes: string;
  approved: boolean;
}): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".vendor_questionnaire_submissions SET
      reviewed_at = NOW(), reviewer_id = $2, review_notes = $3,
      status = $4
     WHERE submission_id = $1`,
    [params.submissionId, params.reviewerId, params.notes, params.approved ? 'approved' : 'rejected'],
  );
}
