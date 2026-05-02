/**
 * Assessments service — tenant-scoped CRUD over `<tenant_schema>.compliance_assessments`.
 *
 * Same discipline as W9–W11: strict `tenant_<id>` schema regex, never embeds
 * the schema as user data. Status enum constrained to:
 *   ('draft','in_progress','under_review','completed','closed').
 */
import type { DbClient } from '../../db/runner';

export type AssessmentStatus = 'draft' | 'in_progress' | 'under_review' | 'completed' | 'closed';

export interface AssessmentRow {
  id: string;
  tenantId: string;
  frameworkId: string;
  name: string;
  status: AssessmentStatus;
  assessmentDate: string | null;
  scope: string | null;
  assessorId: string | null;
  overallScore: number | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListAssessmentsInput {
  tenantSchema: string;
  tenantId: string;
  status?: AssessmentStatus;
  frameworkId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateAssessmentInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  frameworkId: string;
  name: string;
  status?: AssessmentStatus;
  assessmentDate?: string | null;
  scope?: string | null;
  assessorId?: string | null;
  overallScore?: number | null;
}

export interface UpdateAssessmentStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: AssessmentStatus;
  overallScore?: number | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<AssessmentStatus> = new Set([
  'draft', 'in_progress', 'under_review', 'completed', 'closed',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is AssessmentStatus {
  if (!STATUSES.has(s as AssessmentStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, framework_id, name, status, assessment_date,
              scope, assessor_id, overall_score, created_by, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; framework_id: string; name: string;
  status: AssessmentStatus; assessment_date: string | null; scope: string | null;
  assessor_id: string | null; overall_score: number | null; created_by: string;
  created_at: string; updated_at: string;
}): AssessmentRow => ({
  id: x.id, tenantId: x.tenant_id, frameworkId: x.framework_id, name: x.name,
  status: x.status, assessmentDate: x.assessment_date, scope: x.scope,
  assessorId: x.assessor_id, overallScore: x.overall_score === null ? null : Number(x.overall_score),
  createdBy: x.created_by, createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listAssessments(
  client: DbClient,
  input: ListAssessmentsInput,
): Promise<{ rows: AssessmentRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.frameworkId) { params.push(input.frameworkId); where += ` AND framework_id = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_assessments
     WHERE ${where} ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_assessments WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getAssessment(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<AssessmentRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_assessments
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createAssessment(
  client: DbClient,
  input: CreateAssessmentInput,
): Promise<AssessmentRow> {
  assertSchema(input.tenantSchema);
  if (!input.frameworkId || !input.name) {
    throw Object.assign(new Error('frameworkId and name required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  if (input.overallScore != null && (input.overallScore < 0 || input.overallScore > 100)) {
    throw Object.assign(new Error('overallScore must be between 0 and 100'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_assessments
       (tenant_id, framework_id, name, status, assessment_date, scope,
        assessor_id, overall_score, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.frameworkId, input.name,
      input.status ?? 'draft',
      input.assessmentDate ?? null, input.scope ?? null,
      input.assessorId ?? null, input.overallScore ?? null,
      input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateAssessmentStatus(
  client: DbClient,
  input: UpdateAssessmentStatusInput,
): Promise<AssessmentRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  if (input.overallScore != null && (input.overallScore < 0 || input.overallScore > 100)) {
    throw Object.assign(new Error('overallScore must be between 0 and 100'), { code: 'bad_input' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_assessments
        SET status = $3, overall_score = COALESCE($4, overall_score), updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status, input.overallScore ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export const __testing__ = { SCHEMA_RE, STATUSES, assertSchema, assertStatus };
