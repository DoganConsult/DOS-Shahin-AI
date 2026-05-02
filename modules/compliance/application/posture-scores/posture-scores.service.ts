/**
 * Posture Scores service — tenant-scoped CRUD + latest-by-framework over
 * `<tenant_schema>.compliance_posture_scores`.
 *
 * Posture scores are immutable snapshots; updates are rejected — call create
 * (record) again to capture a new computed value. Listing supports
 * "latest snapshot per framework" via the `latestPerFramework` flag.
 */
import type { DbClient } from '../../db/runner';

export interface PostureScoreRow {
  id: string;
  tenantId: string;
  frameworkId: string;
  score: number;
  totalRequirements: number;
  compliant: number;
  partiallyCompliant: number;
  nonCompliant: number;
  notApplicable: number;
  computedAt: string;
  period: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListPostureScoresInput {
  tenantSchema: string;
  tenantId: string;
  frameworkId?: string;
  period?: string;
  /** When true, return only the most recent snapshot per framework. */
  latestPerFramework?: boolean;
  limit?: number;
  offset?: number;
}

export interface RecordPostureScoreInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  frameworkId: string;
  score: number;
  totalRequirements?: number;
  compliant?: number;
  partiallyCompliant?: number;
  nonCompliant?: number;
  notApplicable?: number;
  period?: string | null;
  computedAt?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, tenant_id, framework_id, score, total_requirements,
              compliant, partially_compliant, non_compliant, not_applicable,
              computed_at, period, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; framework_id: string;
  score: string | number; total_requirements: number;
  compliant: number; partially_compliant: number;
  non_compliant: number; not_applicable: number;
  computed_at: string; period: string | null;
  created_at: string; updated_at: string;
}): PostureScoreRow => ({
  id: x.id, tenantId: x.tenant_id, frameworkId: x.framework_id,
  score: typeof x.score === 'string' ? Number(x.score) : x.score,
  totalRequirements: x.total_requirements,
  compliant: x.compliant, partiallyCompliant: x.partially_compliant,
  nonCompliant: x.non_compliant, notApplicable: x.not_applicable,
  computedAt: x.computed_at, period: x.period,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listPostureScores(
  client: DbClient,
  input: ListPostureScoresInput,
): Promise<{ rows: PostureScoreRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.frameworkId) { params.push(input.frameworkId); where += ` AND framework_id = $${params.length}`; }
  if (input.period) { params.push(input.period); where += ` AND period = $${params.length}`; }
  if (input.latestPerFramework) {
    const rows = await client.query(
      `SELECT DISTINCT ON (framework_id) ${COLS}
         FROM "${input.tenantSchema}".compliance_posture_scores
        WHERE ${where}
        ORDER BY framework_id, computed_at DESC
        LIMIT ${limit} OFFSET ${offset}`,
      params,
    );
    const totalR = await client.query<{ n: string }>(
      `SELECT COUNT(DISTINCT framework_id)::text AS n
         FROM "${input.tenantSchema}".compliance_posture_scores WHERE ${where}`,
      params,
    );
    return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_posture_scores
     WHERE ${where} ORDER BY computed_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_posture_scores WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getPostureScore(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<PostureScoreRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_posture_scores
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function recordPostureScore(
  client: DbClient,
  input: RecordPostureScoreInput,
): Promise<PostureScoreRow> {
  assertSchema(input.tenantSchema);
  if (!input.frameworkId) {
    throw Object.assign(new Error('frameworkId required'), { code: 'bad_input' });
  }
  if (typeof input.score !== 'number' || Number.isNaN(input.score)) {
    throw Object.assign(new Error('score must be a number'), { code: 'bad_input' });
  }
  if (input.score < 0 || input.score > 100) {
    throw Object.assign(new Error('score must be 0..100'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_posture_scores
       (tenant_id, framework_id, score, total_requirements,
        compliant, partially_compliant, non_compliant, not_applicable,
        computed_at, period)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
             COALESCE($9::timestamptz, NOW()), $10)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.frameworkId, input.score,
      input.totalRequirements ?? 0,
      input.compliant ?? 0, input.partiallyCompliant ?? 0,
      input.nonCompliant ?? 0, input.notApplicable ?? 0,
      input.computedAt ?? null, input.period ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}
