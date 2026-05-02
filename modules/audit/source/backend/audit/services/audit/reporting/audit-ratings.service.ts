// ============================================
// Shahin — Audit Ratings Service
// Engagement-level audit ratings (upsert pattern)
// Table: audit_ratings
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── Get rating for an audit ─────────────────────────────────────────

export async function getRating(tenantId: string, auditId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${s}".audit_ratings
     WHERE audit_id = $1`,
    [auditId]
  );
  return getFirstRow(result) || null;
}

// ── Set (upsert) rating for an audit ────────────────────────────────

export async function setRating(tenantId: string, data: {
  audit_id: string; overall_rating: string; effectiveness_score?: number;
  compliance_score?: number; risk_score?: number; comments?: string;
  rated_by?: string;
}) {
  const s = tenantSchema(tenantId);
  const id = uuid();
  const result = await safeQuery(
    `INSERT INTO "${s}".audit_ratings
       (id, audit_id, overall_rating, effectiveness_score, compliance_score,
        risk_score, comments, rated_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (audit_id)
     DO UPDATE SET
       overall_rating = $3,
       effectiveness_score = $4,
       compliance_score = $5,
       risk_score = $6,
       comments = $7,
       rated_by = $8,
       updated_at = NOW()
     RETURNING *`,
    [id, data.audit_id, data.overall_rating,
     data.effectiveness_score || null, data.compliance_score || null,
     data.risk_score || null, data.comments || null, data.rated_by || null]
  );
  return getFirstRow(result);
}

// ── Ratings summary (count per overall_rating) ──────────────────────

export async function getRatingsSummary(tenantId: string) {
  const s = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       overall_rating,
       COUNT(*)::int AS count
     FROM "${s}".audit_ratings
     GROUP BY overall_rating
     ORDER BY count DESC`
  );
  return result.rows;
}
