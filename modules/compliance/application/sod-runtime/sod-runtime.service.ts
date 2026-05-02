/**
 * SoD-Runtime service — evaluation engine that, for a candidate set of
 * roles a user holds (or is about to receive), looks up the active conflict
 * pairs in `<tenant_schema>.sod_conflict_matrix` and persists a verdict row
 * in `<tenant_schema>.sod_evaluations`.
 *
 * Verdicts:
 *   allowed             — no matching pair in the matrix
 *   blocked             — at least one `forbidden` pair is matched
 *   requires_approval   — at least one `requires_approval` pair, no blocked
 *   requires_review     — at least one `requires_review` pair only
 */
import type { DbClient } from '../../db/runner';

export type SodVerdict = 'allowed' | 'blocked' | 'requires_approval' | 'requires_review';
const VERDICTS: ReadonlyArray<SodVerdict> = ['allowed', 'blocked', 'requires_approval', 'requires_review'];

export interface SodConflictHit {
  roleA: string;
  roleB: string;
  conflictType: 'forbidden' | 'requires_approval' | 'requires_review';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SodEvaluationRow {
  evaluationId: string;
  subjectUserId: string;
  candidateRoles: string[];
  verdict: SodVerdict;
  hits: SodConflictHit[];
  context: Record<string, unknown>;
  evaluatedAt: string;
  evaluatedBy: string;
}

export interface ListEvaluationsInput {
  tenantSchema: string;
  subjectUserId?: string;
  verdict?: SodVerdict;
  limit?: number;
  offset?: number;
}

export interface EvaluateInput {
  tenantSchema: string;
  actorId: string;
  subjectUserId: string;
  candidateRoles: string[];
  context?: Record<string, unknown>;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `evaluation_id, subject_user_id, candidate_roles, verdict,
              hits, context, evaluated_at, evaluated_by`;

const mapRow = (x: {
  evaluation_id: string; subject_user_id: string;
  candidate_roles: string[] | string | null;
  verdict: string;
  hits: SodConflictHit[] | null;
  context: Record<string, unknown> | null;
  evaluated_at: string; evaluated_by: string;
}): SodEvaluationRow => ({
  evaluationId: x.evaluation_id,
  subjectUserId: x.subject_user_id,
  candidateRoles: Array.isArray(x.candidate_roles) ? x.candidate_roles
    : typeof x.candidate_roles === 'string' ? JSON.parse(x.candidate_roles) : [],
  verdict: x.verdict as SodVerdict,
  hits: x.hits ?? [],
  context: x.context ?? {},
  evaluatedAt: x.evaluated_at, evaluatedBy: x.evaluated_by,
});

export function deriveVerdict(hits: SodConflictHit[]): SodVerdict {
  if (hits.length === 0) return 'allowed';
  if (hits.some((h) => h.conflictType === 'forbidden')) return 'blocked';
  if (hits.some((h) => h.conflictType === 'requires_approval')) return 'requires_approval';
  return 'requires_review';
}

export async function listEvaluations(
  client: DbClient,
  input: ListEvaluationsInput,
): Promise<{ rows: SodEvaluationRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.subjectUserId) { params.push(input.subjectUserId); where += ` AND subject_user_id = $${params.length}`; }
  if (input.verdict) { params.push(input.verdict); where += ` AND verdict = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".sod_evaluations
     WHERE ${where} ORDER BY evaluated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".sod_evaluations WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getEvaluation(
  client: DbClient,
  input: { tenantSchema: string; evaluationId: string },
): Promise<SodEvaluationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".sod_evaluations
     WHERE evaluation_id = $1`,
    [input.evaluationId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function evaluateSod(
  client: DbClient,
  input: EvaluateInput,
): Promise<SodEvaluationRow> {
  assertSchema(input.tenantSchema);
  if (!input.subjectUserId || !Array.isArray(input.candidateRoles)) {
    throw Object.assign(
      new Error('subjectUserId, candidateRoles required'), { code: 'bad_input' },
    );
  }
  const roles = input.candidateRoles.filter((r) => typeof r === 'string' && r.length > 0);

  let hits: SodConflictHit[] = [];
  if (roles.length >= 2) {
    const placeholders = roles.map((_, i) => `$${i + 1}`).join(',');
    const r = await client.query<{
      role_a: string; role_b: string; conflict_type: string; severity: string;
    }>(
      `SELECT role_a, role_b, conflict_type, severity
         FROM "${input.tenantSchema}".sod_conflict_matrix
        WHERE role_a IN (${placeholders}) AND role_b IN (${placeholders})`,
      [...roles, ...roles],
    );
    hits = r.rows.map((row) => ({
      roleA: row.role_a, roleB: row.role_b,
      conflictType: row.conflict_type as SodConflictHit['conflictType'],
      severity: row.severity as SodConflictHit['severity'],
    }));
  }

  const verdict = deriveVerdict(hits);
  if (!VERDICTS.includes(verdict)) {
    throw Object.assign(new Error(`bad verdict: ${verdict}`), { code: 'bad_verdict' });
  }

  const ins = await client.query(
    `INSERT INTO "${input.tenantSchema}".sod_evaluations
       (subject_user_id, candidate_roles, verdict, hits, context, evaluated_by)
     VALUES ($1, $2::jsonb, $3, $4::jsonb, $5::jsonb, $6)
     RETURNING ${COLS}`,
    [
      input.subjectUserId,
      JSON.stringify(roles),
      verdict,
      JSON.stringify(hits),
      JSON.stringify(input.context ?? {}),
      input.actorId,
    ],
  );
  return mapRow(ins.rows[0] as never);
}
