// ============================================
// Shahin — Remediation Verification Service
// Evidence submission, review, accept/reject,
// sign-off management, re-verification scheduling
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// === Types ===

export type VerificationStatus = 'pending' | 'evidence_submitted' | 'under_review' | 'accepted' | 'rejected' | 'requires_reverification';

export interface VerificationWorkflow {
  verificationId: string;
  planId: string;
  taskId: string | null;
  title: string;
  requirementDescription: string;
  status: VerificationStatus;
  submittedBy: string | null;
  submittedAt: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  signedOffBy: string | null;
  signedOffAt: string | null;
  nextVerificationDate: string | null;
  createdAt: string;
}

export interface VerificationEvidence {
  evidenceId: string;
  verificationId: string;
  title: string;
  description: string;
  evidenceType: 'document' | 'screenshot' | 'log' | 'attestation' | 'other';
  fileReference: string | null;
  submittedBy: string;
  createdAt: string;
}

// === Pure Functions ===

export function computeNextVerificationDate(
  acceptedAt: Date,
  intervalDays: number
): Date {
  const next = new Date(acceptedAt);
  next.setDate(next.getDate() + intervalDays);
  return next;
}

export function isVerificationComplete(status: VerificationStatus): boolean {
  return status === 'accepted';
}

export function canSubmitEvidence(status: VerificationStatus): boolean {
  return status === 'pending' || status === 'rejected' || status === 'requires_reverification';
}

export function canReview(status: VerificationStatus): boolean {
  return status === 'evidence_submitted';
}

// === Mappers ===

function mapVerification( r: Record<string, unknown>): VerificationWorkflow {
  return {

    verificationId: r.verification_id,

    planId: r.plan_id,

    taskId: r.task_id || null,

    title: r.title,

    requirementDescription: r.requirement_description || '',

    status: r.status,

    submittedBy: r.submitted_by || null,

    submittedAt: r.submitted_at?.toISOString?.() || r.submitted_at || null,

    reviewedBy: r.reviewed_by || null,

    reviewedAt: r.reviewed_at?.toISOString?.() || r.reviewed_at || null,

    rejectionReason: r.rejection_reason || null,

    signedOffBy: r.signed_off_by || null,

    signedOffAt: r.signed_off_at?.toISOString?.() || r.signed_off_at || null,

    nextVerificationDate: r.next_verification_date?.toISOString?.().split('T')[0] || r.next_verification_date || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

function mapEvidence( r: Record<string, unknown>): VerificationEvidence {
  return {

    evidenceId: r.evidence_id,

    verificationId: r.verification_id,

    title: r.title,

    description: r.description || '',

    evidenceType: r.evidence_type || 'other',

    fileReference: r.file_reference || null,

    submittedBy: r.submitted_by,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

// === Workflow CRUD ===

export async function createVerificationWorkflow(
  tenantId: string,
  data: {
    planId: string;
    taskId?: string;
    title: string;
    requirementDescription?: string;
  }
): Promise<VerificationWorkflow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_verifications
       (verification_id, plan_id, task_id, title, requirement_description, status)
     VALUES ($1,$2,$3,$4,$5,'pending') RETURNING *`,
    [uuid(), data.planId, data.taskId || null, data.title, data.requirementDescription || '']
  );
  return mapVerification(getFirstRow(result));
}

export async function getVerifications(
  tenantId: string,
  filters?: { planId?: string; status?: VerificationStatus }
): Promise<VerificationWorkflow[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.planId) { conditions.push(`plan_id = $${idx++}`); params.push(filters.planId); }
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_verifications ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapVerification);
}

export async function getVerificationById(
  tenantId: string,
  verificationId: string
): Promise<VerificationWorkflow | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_verifications WHERE verification_id = $1`,
    [verificationId]
  );
  const row = getFirstRow(result)!;
  return row ? mapVerification(row) : null;
}

// === Workflow Transitions ===

export async function submitEvidence(
  tenantId: string,
  verificationId: string,
  submittedBy: string
): Promise<VerificationWorkflow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_verifications
     SET status = 'evidence_submitted',
         submitted_by = $2,
         submitted_at = NOW(),
         updated_at = NOW()
     WHERE verification_id = $1
     RETURNING *`,
    [verificationId, submittedBy],
  );
  return mapVerification(getFirstRow(result));
}

export async function startReview(
  tenantId: string,
  verificationId: string,
  reviewerId: string
): Promise<VerificationWorkflow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_verifications
     SET status = 'in_review',
         reviewed_by = $2,
         reviewed_at = NOW(),
         updated_at = NOW()
     WHERE verification_id = $1
     RETURNING *`,
    [verificationId, reviewerId],
  );
  return mapVerification(getFirstRow(result));
}

export async function acceptVerification(
  tenantId: string,
  verificationId: string,
  reviewerId: string,
  reverificationIntervalDays?: number
): Promise<VerificationWorkflow> {
  const schema = tenantSchema(tenantId);
  const nextDate = reverificationIntervalDays
    ? (() => {
        const d = new Date();
        d.setDate(d.getDate() + reverificationIntervalDays);
        return d.toISOString().split('T')[0];
      })()
    : null;
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_verifications
     SET status = 'accepted',
         reviewed_by = $2,
         reviewed_at = NOW(),
         rejection_reason = NULL,
         next_verification_date = COALESCE($3, next_verification_date),
         updated_at = NOW()
     WHERE verification_id = $1
     RETURNING *`,
    [verificationId, reviewerId, nextDate],
  );
  return mapVerification(getFirstRow(result));
}

export async function rejectVerification(
  tenantId: string,
  verificationId: string,
  reviewerId: string,
  rejectionReason: string
): Promise<VerificationWorkflow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_verifications
     SET status = 'rejected',
         reviewed_by = $2,
         reviewed_at = NOW(),
         rejection_reason = $3,
         updated_at = NOW()
     WHERE verification_id = $1
     RETURNING *`,
    [verificationId, reviewerId, rejectionReason],
  );
  return mapVerification(getFirstRow(result));
}

export async function signOff(
  tenantId: string,
  verificationId: string,
  signedOffBy: string
): Promise<VerificationWorkflow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_verifications
     SET status = 'signed_off',
         signed_off_by = $2,
         signed_off_at = NOW(),
         updated_at = NOW()
     WHERE verification_id = $1
     RETURNING *`,
    [verificationId, signedOffBy],
  );
  return mapVerification(getFirstRow(result));
}

export async function scheduleReverification(
  tenantId: string,
  verificationId: string,
  nextDate: string
): Promise<VerificationWorkflow> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_verifications
     SET next_verification_date = $2, status = 'requires_reverification', updated_at = NOW()
     WHERE verification_id = $1
     RETURNING *`,
    [verificationId, nextDate],
  );
  return mapVerification(getFirstRow(result));
}

// === Evidence Collection ===

export async function addEvidence(
  tenantId: string,
  data: {
    verificationId: string;
    title: string;
    description?: string;
    evidenceType?: VerificationEvidence['evidenceType'];
    fileReference?: string;
    submittedBy: string;
  }
): Promise<VerificationEvidence> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_evidence
       (evidence_id, verification_id, title, description, evidence_type, file_reference, submitted_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [
      uuid(), data.verificationId, data.title,
      data.description || '', data.evidenceType || 'other',
      data.fileReference || null, data.submittedBy,
    ]
  );
  return mapEvidence(getFirstRow(result));
}

export async function getEvidence(
  tenantId: string,
  verificationId: string
): Promise<VerificationEvidence[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_evidence WHERE verification_id = $1 ORDER BY created_at ASC`,
    [verificationId]
  );
  return result.rows.map(mapEvidence);
}

export async function getDueForReverification(
  tenantId: string
): Promise<VerificationWorkflow[]> {
  const schema = tenantSchema(tenantId);
  const today = new Date().toISOString().split('T')[0];
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_verifications
     WHERE status = 'requires_reverification' AND next_verification_date <= $1
     ORDER BY next_verification_date ASC`,
    [today]
  );
  return result.rows.map(mapVerification);
}
