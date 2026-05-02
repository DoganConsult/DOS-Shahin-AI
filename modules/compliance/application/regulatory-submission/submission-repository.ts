// ============================================
// Shahin — Submission Draft Repository
// CRUD operations for regulatory submissions
// stored in the tenant schema
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from "@dos/db";
import { RegulatorySubmissionDraft } from "./submission.types";
import type { GenericRow } from '@dos/types';

/**
 * Save submission draft to database.
 * Creates the regulatory_submissions table if it does not exist,
 * then upserts the draft by submission_id.
 */
export async function saveSubmissionDraft(
  tenantId: string,
  draft: RegulatorySubmissionDraft
): Promise<string> {
  const schema = tenantSchema(tenantId);

  // Ensure table exists
  await safeQuery(
    `CREATE TABLE IF NOT EXISTS "${schema}".regulatory_submissions (
      submission_id VARCHAR(255) PRIMARY KEY,
      tenant_id VARCHAR(16) NOT NULL,
      regulator_code VARCHAR(50) NOT NULL,
      framework_code VARCHAR(50) NOT NULL,
      submission_type VARCHAR(50) NOT NULL,
      period_start DATE NOT NULL,
      period_end DATE NOT NULL,
      language VARCHAR(20) NOT NULL,
      status VARCHAR(50) NOT NULL DEFAULT 'draft',
      draft_data JSONB NOT NULL,
      generated_at TIMESTAMPTZ NOT NULL,
      generated_by VARCHAR(255) NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )`,
    []
  );

  await safeQuery(
    `INSERT INTO "${schema}".regulatory_submissions
     (submission_id, tenant_id, regulator_code, framework_code, submission_type,
      period_start, period_end, language, status, draft_data, generated_at, generated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (submission_id)
     DO UPDATE SET
       draft_data = EXCLUDED.draft_data,
       status = EXCLUDED.status,
       updated_at = NOW()`,
    [
      draft.submissionId,
      tenantId,
      draft.regulatorCode,
      draft.frameworkCode,
      draft.submissionType,
      draft.periodStart,
      draft.periodEnd,
      draft.language,
      draft.status,
      JSON.stringify(draft),
      draft.generatedAt,
      draft.generatedBy,
    ]
  );

  return draft.submissionId;
}

/**
 * Get saved submission draft by ID
 */
export async function getSubmissionDraft(
  tenantId: string,
  submissionId: string
): Promise<RegulatorySubmissionDraft | null> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT draft_data FROM "${schema}".regulatory_submissions
     WHERE submission_id = $1 AND tenant_id = $2
     LIMIT 1`,
    [submissionId, tenantId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return getFirstRow(result)?.draft_data as RegulatorySubmissionDraft;
}

/**
 * List all submission drafts for a tenant, optionally filtered by regulator/framework
 */
export async function listSubmissionDrafts(
  tenantId: string,
  regulatorCode?: string,
  frameworkCode?: string
): Promise<RegulatorySubmissionDraft[]> {
  const schema = tenantSchema(tenantId);

  let query = `SELECT draft_data FROM "${schema}".regulatory_submissions WHERE tenant_id = $1`;
  const params: unknown[] = [tenantId];

  if (regulatorCode) {
    query += ` AND regulator_code = $${params.length + 1}`;
    params.push(regulatorCode);
  }

  if (frameworkCode) {
    query += ` AND framework_code = $${params.length + 1}`;
    params.push(frameworkCode);
  }

  query += ` ORDER BY generated_at DESC`;

  const result = await safeQuery(query, params);

  return result.rows.map((r: GenericRow) => r.draft_data as RegulatorySubmissionDraft);
}

/**
 * Update submission draft status (draft -> review -> approved -> submitted)
 */
export async function updateSubmissionStatus(
  tenantId: string,
  submissionId: string,
  status: "draft" | "review" | "approved" | "submitted",
  reviewNotes?: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".regulatory_submissions
     SET status = $1, updated_at = NOW(),
         draft_data = jsonb_set(draft_data, '{status}', $2::jsonb)
     WHERE submission_id = $3 AND tenant_id = $4`,
    [status, JSON.stringify(status), submissionId, tenantId]
  );

  // If review notes provided, update the draft_data
  if (reviewNotes) {
    const draft = await getSubmissionDraft(tenantId, submissionId);
    if (draft) {
      // Update review notes in sections that require review
      for (const section of draft.sections) {
        if (section.requiresReview) {
          section.reviewNotes = reviewNotes;
        }
      }
      await saveSubmissionDraft(tenantId, draft);
    }
  }
}
