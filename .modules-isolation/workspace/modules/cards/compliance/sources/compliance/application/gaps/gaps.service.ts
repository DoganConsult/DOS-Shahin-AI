/**
 * Gaps service — tenant-scoped CRUD over `<tenant_schema>.compliance_gaps`.
 *
 * Schema enums:
 *   gap_status        : 'open' | 'in_remediation' | 'closed' | 'accepted'
 *   compliance_level  : 'fully_compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable'
 *
 * Gaps link an assessment to a requirement and carry finding/remediation state.
 */
import type { DbClient } from '../../db/runner';

export type GapStatus = 'open' | 'in_remediation' | 'closed' | 'accepted';
export type ComplianceLevel =
  | 'fully_compliant' | 'partially_compliant' | 'non_compliant' | 'not_applicable';

export interface GapRow {
  id: string;
  tenantId: string;
  assessmentId: string;
  requirementId: string;
  gapStatus: GapStatus;
  complianceLevel: ComplianceLevel;
  findingText: string | null;
  remediationPlan: string | null;
  dueDate: string | null;
  ownerId: string | null;
  evidenceRefs: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface ListGapsInput {
  tenantSchema: string;
  tenantId: string;
  assessmentId?: string;
  requirementId?: string;
  gapStatus?: GapStatus;
  complianceLevel?: ComplianceLevel;
  ownerId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateGapInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  assessmentId: string;
  requirementId: string;
  gapStatus?: GapStatus;
  complianceLevel?: ComplianceLevel;
  findingText?: string | null;
  remediationPlan?: string | null;
  dueDate?: string | null;
  ownerId?: string | null;
  evidenceRefs?: unknown[];
}

export interface UpdateGapStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  gapStatus: GapStatus;
  complianceLevel?: ComplianceLevel;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<GapStatus> = new Set(['open', 'in_remediation', 'closed', 'accepted']);
const LEVELS: ReadonlySet<ComplianceLevel> = new Set([
  'fully_compliant', 'partially_compliant', 'non_compliant', 'not_applicable',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is GapStatus {
  if (!STATUSES.has(s as GapStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}
function assertLevel(s: string): asserts s is ComplianceLevel {
  if (!LEVELS.has(s as ComplianceLevel)) throw Object.assign(new Error(`bad_level:${s}`), { code: 'bad_level' });
}

const COLS = `id, tenant_id, assessment_id, requirement_id, gap_status, compliance_level,
              finding_text, remediation_plan, due_date, owner_id, evidence_refs,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; assessment_id: string; requirement_id: string;
  gap_status: GapStatus; compliance_level: ComplianceLevel;
  finding_text: string | null; remediation_plan: string | null;
  due_date: string | null; owner_id: string | null;
  evidence_refs: unknown[]; created_at: string; updated_at: string;
}): GapRow => ({
  id: x.id, tenantId: x.tenant_id, assessmentId: x.assessment_id,
  requirementId: x.requirement_id, gapStatus: x.gap_status, complianceLevel: x.compliance_level,
  findingText: x.finding_text, remediationPlan: x.remediation_plan,
  dueDate: x.due_date, ownerId: x.owner_id,
  evidenceRefs: x.evidence_refs ?? [], createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listGaps(
  client: DbClient,
  input: ListGapsInput,
): Promise<{ rows: GapRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.assessmentId) { params.push(input.assessmentId); where += ` AND assessment_id = $${params.length}`; }
  if (input.requirementId) { params.push(input.requirementId); where += ` AND requirement_id = $${params.length}`; }
  if (input.gapStatus) { assertStatus(input.gapStatus); params.push(input.gapStatus); where += ` AND gap_status = $${params.length}`; }
  if (input.complianceLevel) { assertLevel(input.complianceLevel); params.push(input.complianceLevel); where += ` AND compliance_level = $${params.length}`; }
  if (input.ownerId) { params.push(input.ownerId); where += ` AND owner_id = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_gaps
     WHERE ${where} ORDER BY due_date NULLS LAST, updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_gaps WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getGap(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<GapRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_gaps
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createGap(
  client: DbClient,
  input: CreateGapInput,
): Promise<GapRow> {
  assertSchema(input.tenantSchema);
  if (!input.assessmentId || !input.requirementId) {
    throw Object.assign(new Error('assessmentId and requirementId required'), { code: 'bad_input' });
  }
  if (input.gapStatus) assertStatus(input.gapStatus);
  if (input.complianceLevel) assertLevel(input.complianceLevel);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_gaps
       (tenant_id, assessment_id, requirement_id, gap_status, compliance_level,
        finding_text, remediation_plan, due_date, owner_id, evidence_refs)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.assessmentId, input.requirementId,
      input.gapStatus ?? 'open', input.complianceLevel ?? 'non_compliant',
      input.findingText ?? null, input.remediationPlan ?? null,
      input.dueDate ?? null, input.ownerId ?? null,
      JSON.stringify(input.evidenceRefs ?? []),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateGapStatus(
  client: DbClient,
  input: UpdateGapStatusInput,
): Promise<GapRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.gapStatus);
  if (input.complianceLevel) assertLevel(input.complianceLevel);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_gaps
        SET gap_status = $3,
            compliance_level = COALESCE($4, compliance_level),
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.gapStatus, input.complianceLevel ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export const __testing__ = { SCHEMA_RE, STATUSES, LEVELS, assertSchema, assertStatus, assertLevel };
