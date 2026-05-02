/**
 * Control-Effectiveness Assessments service — append-only design/operating
 * effectiveness assessments over `<tenant_schema>.control_effectiveness_assessments`.
 *
 * Each assessment is a point-in-time record. No update/delete (audit grade).
 */
import type { DbClient } from '../../db/runner';

export type AssessmentType = 'design' | 'operating';
const ASSESSMENT_TYPES: ReadonlyArray<AssessmentType> = ['design', 'operating'];

export type EffectivenessRating =
  | 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
const RATINGS: ReadonlyArray<EffectivenessRating> =
  ['effective', 'partially_effective', 'ineffective', 'not_assessed'];

export interface ControlEffectivenessRow {
  assessmentId: string;
  controlId: string;
  assessmentType: AssessmentType;
  rating: EffectivenessRating;
  evidenceReference: string | null;
  assessedBy: string | null;
  notes: string | null;
  assessmentDate: string;
  createdAt: string;
}

export interface ListEffectivenessInput {
  tenantSchema: string;
  controlId?: string;
  assessmentType?: AssessmentType;
  rating?: EffectivenessRating;
  limit?: number;
  offset?: number;
}

export interface CreateEffectivenessInput {
  tenantSchema: string;
  actorId: string;
  controlId: string;
  assessmentType?: AssessmentType;
  rating?: EffectivenessRating;
  evidenceReference?: string | null;
  assessedBy?: string | null;
  notes?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `assessment_id, control_id, assessment_type, rating, evidence_reference,
              assessed_by, notes, assessment_date, created_at`;

const mapRow = (x: {
  assessment_id: string; control_id: string; assessment_type: string; rating: string;
  evidence_reference: string | null; assessed_by: string | null; notes: string | null;
  assessment_date: string; created_at: string;
}): ControlEffectivenessRow => ({
  assessmentId: x.assessment_id, controlId: x.control_id,
  assessmentType: x.assessment_type as AssessmentType,
  rating: x.rating as EffectivenessRating,
  evidenceReference: x.evidence_reference, assessedBy: x.assessed_by,
  notes: x.notes, assessmentDate: x.assessment_date, createdAt: x.created_at,
});

export async function listEffectiveness(
  client: DbClient,
  input: ListEffectivenessInput,
): Promise<{ rows: ControlEffectivenessRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.assessmentType) { params.push(input.assessmentType); where += ` AND assessment_type = $${params.length}`; }
  if (input.rating) { params.push(input.rating); where += ` AND rating = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_effectiveness_assessments
     WHERE ${where} ORDER BY assessment_date DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".control_effectiveness_assessments WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getEffectiveness(
  client: DbClient,
  input: { tenantSchema: string; assessmentId: string },
): Promise<ControlEffectivenessRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_effectiveness_assessments
     WHERE assessment_id = $1`,
    [input.assessmentId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function getLatestEffectiveness(
  client: DbClient,
  input: { tenantSchema: string; controlId: string; assessmentType?: AssessmentType },
): Promise<ControlEffectivenessRow | null> {
  assertSchema(input.tenantSchema);
  const params: unknown[] = [input.controlId];
  let where = `control_id = $1`;
  if (input.assessmentType) {
    params.push(input.assessmentType);
    where += ` AND assessment_type = $2`;
  }
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_effectiveness_assessments
     WHERE ${where} ORDER BY assessment_date DESC LIMIT 1`,
    params,
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createEffectiveness(
  client: DbClient,
  input: CreateEffectivenessInput,
): Promise<ControlEffectivenessRow> {
  assertSchema(input.tenantSchema);
  if (!input.controlId) {
    throw Object.assign(new Error('controlId required'), { code: 'bad_input' });
  }
  if (input.assessmentType && !ASSESSMENT_TYPES.includes(input.assessmentType)) {
    throw Object.assign(new Error(`bad assessment_type: ${input.assessmentType}`),
      { code: 'bad_assessment_type' });
  }
  if (input.rating && !RATINGS.includes(input.rating)) {
    throw Object.assign(new Error(`bad rating: ${input.rating}`), { code: 'bad_rating' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".control_effectiveness_assessments
       (control_id, assessment_type, rating, evidence_reference, assessed_by, notes)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.controlId,
      input.assessmentType ?? 'design',
      input.rating ?? 'not_assessed',
      input.evidenceReference ?? null,
      input.assessedBy ?? input.actorId,
      input.notes ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}
