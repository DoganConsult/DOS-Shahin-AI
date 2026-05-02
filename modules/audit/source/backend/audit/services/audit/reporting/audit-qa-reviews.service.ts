// ============================================
// Shahin — Audit QA Reviews Service
// QA peer review management for audit engagements
// Table: audit_qa_reviews
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── List reviews for an audit ───────────────────────────────────────

export async function listReviews(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_qa_reviews
     WHERE audit_id = $1
     ORDER BY created_at DESC`,
    [auditId]
  );
  return result.rows;
}

// ── Create QA review ────────────────────────────────────────────────

export async function createReview(tenantId: string, data: {
  audit_id: string; reviewer_id: string; review_type?: string;
  scope?: string; checklist?: Record<string, unknown>; comments?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_qa_reviews
       (id, audit_id, reviewer_id, review_type, scope, checklist, comments, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'pending')
     RETURNING *`,
    [id, data.audit_id, data.reviewer_id, data.review_type || 'peer',
     data.scope || null, data.checklist ? JSON.stringify(data.checklist) : null,
     data.comments || null]
  );
  return getFirstRow(result);
}

// ── Approve review ──────────────────────────────────────────────────

export async function approveReview(tenantId: string, id: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Reject review ───────────────────────────────────────────────────

export async function rejectReview(tenantId: string, id: string, comments: string) {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Get all pending reviews across audits ───────────────────────────

export async function getPendingReviews(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT qr.*, a.title AS audit_title
     FROM "${s}".audit_qa_reviews qr
     LEFT JOIN "${s}".audits a ON a.audit_id = qr.audit_id
     WHERE qr.status = 'pending'
     ORDER BY qr.created_at ASC`
  );
  return result.rows;
}
