import { safeQuery, tenantSchema } from '../../ports/database.port';
import { randomUUID } from 'crypto';

export interface RegulatorySubmissionDraft {
  submissionId: string;
  tenantId: string;
  regulatorCode: string;
  frameworkCode: string;
  submissionType: string;
  periodStart?: string;
  periodEnd?: string;
  language: string;
  status: string;
  sections: Record<string, unknown>[];
  createdBy: string;
  createdAt: string;
}

export async function generateRegulatorySubmissionDraft(
  tenantId: string,
  regulatorCode: string,
  frameworkCode: string,
  submissionType: string = 'annual',
  periodStart?: string,
  periodEnd?: string,
  language: string = 'bilingual',
  createdBy: string = 'system',
): Promise<RegulatorySubmissionDraft> {
  const submissionId = randomUUID();
  const draft: RegulatorySubmissionDraft = {
    submissionId,
    tenantId,
    regulatorCode,
    frameworkCode,
    submissionType,
    periodStart,
    periodEnd,
    language,
    status: 'draft',
    sections: [],
    createdBy,
    createdAt: new Date().toISOString(),
  };
  return draft;
}

export async function saveSubmissionDraft(
  tenantId: string,
  draft: RegulatorySubmissionDraft,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `INSERT INTO "${schema}".regulatory_submission_drafts
       (submission_id, tenant_id, regulator_code, framework_code, submission_type, status, sections, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (submission_id) DO UPDATE SET sections = $7, status = $6`,
    [draft.submissionId, tenantId, draft.regulatorCode, draft.frameworkCode,
     draft.submissionType, draft.status, JSON.stringify(draft.sections),
     draft.createdBy, draft.createdAt],
  );
}

export async function getSubmissionDraft(
  tenantId: string,
  submissionId: string,
): Promise<RegulatorySubmissionDraft | null> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(
    `SELECT * FROM "${schema}".regulatory_submission_drafts WHERE submission_id = $1 LIMIT 1`,
    [submissionId],
  );
  if (!res.rows[0]) return null;
  const r = res.rows[0];
  return {
    submissionId: r.submission_id,
    tenantId: r.tenant_id,
    regulatorCode: r.regulator_code,
    frameworkCode: r.framework_code,
    submissionType: r.submission_type,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    language: r.language || 'bilingual',
    status: r.status,
    sections: typeof r.sections === 'string' ? JSON.parse(r.sections) : r.sections || [],
    createdBy: r.created_by,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function listSubmissionDrafts(
  tenantId: string,
  regulatorCode?: string,
  frameworkCode?: string,
): Promise<RegulatorySubmissionDraft[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  if (regulatorCode) { params.push(regulatorCode); conditions.push(`regulator_code = $${params.length}`); }
  if (frameworkCode) { params.push(frameworkCode); conditions.push(`framework_code = $${params.length}`); }
  const res = await safeQuery(
    `SELECT * FROM "${schema}".regulatory_submission_drafts WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC LIMIT 100`,
    params,
  );

  return res.rows.map(( r: Record<string, unknown>) => ({
    submissionId: r.submission_id,
    tenantId: r.tenant_id,
    regulatorCode: r.regulator_code,
    frameworkCode: r.framework_code,
    submissionType: r.submission_type,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    language: r.language || 'bilingual',
    status: r.status,
    sections: typeof r.sections === 'string' ? JSON.parse(r.sections) : r.sections || [],
    createdBy: r.created_by,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  }));
}

export async function exportSubmissionDraftPDF(
  _tenantId: string,
  draft: RegulatorySubmissionDraft,
): Promise<Buffer> {
  const content = JSON.stringify(draft, null, 2);
  return Buffer.from(content, 'utf-8');
}

export async function updateSubmissionStatus(
  tenantId: string,
  submissionId: string,
  status: string,
  reviewNotes?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".regulatory_submission_drafts SET status = $1, review_notes = $2 WHERE submission_id = $3`,
    [status, reviewNotes || null, submissionId],
  );
}
