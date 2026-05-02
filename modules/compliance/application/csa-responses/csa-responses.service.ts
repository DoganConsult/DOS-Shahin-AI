/**
 * CSA-Responses service — control self-assessment respondent submissions over
 * `<tenant_schema>.csa_responses`. Append-only by design (no PATCH/DELETE).
 */
import type { DbClient } from '../../db/runner';

export type CsaEffectivenessRating =
  | 'effective' | 'partially_effective' | 'ineffective' | 'not_assessed';
const RATINGS: ReadonlyArray<CsaEffectivenessRating> = [
  'effective', 'partially_effective', 'ineffective', 'not_assessed',
];

export interface CsaResponseRow {
  responseId: string;
  campaignId: string;
  controlId: string;
  respondent: string;
  effectivenessRating: CsaEffectivenessRating;
  designAdequate: boolean | null;
  operatingEffective: boolean | null;
  evidenceAvailable: boolean | null;
  comments: string | null;
  submittedAt: string;
}

export interface ListCsaResponsesInput {
  tenantSchema: string;
  campaignId?: string;
  controlId?: string;
  respondent?: string;
  effectivenessRating?: CsaEffectivenessRating;
  limit?: number;
  offset?: number;
}

export interface CreateCsaResponseInput {
  tenantSchema: string;
  actorId: string;
  campaignId: string;
  controlId: string;
  respondent?: string;
  effectivenessRating?: CsaEffectivenessRating;
  designAdequate?: boolean | null;
  operatingEffective?: boolean | null;
  evidenceAvailable?: boolean | null;
  comments?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `response_id, campaign_id, control_id, respondent,
              effectiveness_rating, design_adequate, operating_effective,
              evidence_available, comments, submitted_at`;

const mapRow = (x: {
  response_id: string; campaign_id: string; control_id: string; respondent: string;
  effectiveness_rating: string; design_adequate: boolean | null;
  operating_effective: boolean | null; evidence_available: boolean | null;
  comments: string | null; submitted_at: string;
}): CsaResponseRow => ({
  responseId: x.response_id, campaignId: x.campaign_id, controlId: x.control_id,
  respondent: x.respondent, effectivenessRating: x.effectiveness_rating as CsaEffectivenessRating,
  designAdequate: x.design_adequate, operatingEffective: x.operating_effective,
  evidenceAvailable: x.evidence_available, comments: x.comments,
  submittedAt: x.submitted_at,
});

export async function listCsaResponses(
  client: DbClient,
  input: ListCsaResponsesInput,
): Promise<{ rows: CsaResponseRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.campaignId) { params.push(input.campaignId); where += ` AND campaign_id = $${params.length}`; }
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.respondent) { params.push(input.respondent); where += ` AND respondent = $${params.length}`; }
  if (input.effectivenessRating) {
    params.push(input.effectivenessRating);
    where += ` AND effectiveness_rating = $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".csa_responses
     WHERE ${where} ORDER BY submitted_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".csa_responses WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getCsaResponse(
  client: DbClient,
  input: { tenantSchema: string; responseId: string },
): Promise<CsaResponseRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".csa_responses
     WHERE response_id = $1`,
    [input.responseId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createCsaResponse(
  client: DbClient,
  input: CreateCsaResponseInput,
): Promise<CsaResponseRow> {
  assertSchema(input.tenantSchema);
  if (!input.campaignId || !input.controlId) {
    throw Object.assign(new Error('campaignId, controlId required'), { code: 'bad_input' });
  }
  if (input.effectivenessRating && !RATINGS.includes(input.effectivenessRating)) {
    throw Object.assign(new Error(`bad rating: ${input.effectivenessRating}`), { code: 'bad_rating' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".csa_responses
       (campaign_id, control_id, respondent, effectiveness_rating,
        design_adequate, operating_effective, evidence_available, comments)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      input.campaignId, input.controlId,
      input.respondent ?? input.actorId,
      input.effectivenessRating ?? 'not_assessed',
      input.designAdequate ?? null,
      input.operatingEffective ?? null,
      input.evidenceAvailable ?? null,
      input.comments ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}
