/**
 * Compliance-Calculator service — deterministic posture aggregator that
 * reads requirements + controls + assessments + gaps for a framework and
 * emits an immutable snapshot row in `<tenant_schema>.compliance_calculations`.
 *
 * Inputs are pulled from existing per-tenant tables; outputs are scored
 * percentages with a breakdown payload (totals, by_status, by_severity).
 */
import type { DbClient } from '../../db/runner';

export type CalculationScope = 'framework' | 'control' | 'workspace';
const SCOPES: ReadonlyArray<CalculationScope> = ['framework', 'control', 'workspace'];

export interface CalculationRow {
  calculationId: string;
  scope: CalculationScope;
  scopeRef: string;
  scorePct: number;
  totalRequirements: number;
  satisfiedRequirements: number;
  partialRequirements: number;
  unsatisfiedRequirements: number;
  openGaps: number;
  breakdown: Record<string, unknown>;
  computedAt: string;
  computedBy: string;
}

export interface ListCalculationsInput {
  tenantSchema: string;
  scope?: CalculationScope;
  scopeRef?: string;
  limit?: number;
  offset?: number;
}

export interface RunCalculationInput {
  tenantSchema: string;
  actorId: string;
  scope: CalculationScope;
  scopeRef: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `calculation_id, scope, scope_ref, score_pct,
              total_requirements, satisfied_requirements,
              partial_requirements, unsatisfied_requirements,
              open_gaps, breakdown, computed_at, computed_by`;

const mapRow = (x: {
  calculation_id: string; scope: string; scope_ref: string; score_pct: string | number;
  total_requirements: string | number; satisfied_requirements: string | number;
  partial_requirements: string | number; unsatisfied_requirements: string | number;
  open_gaps: string | number; breakdown: Record<string, unknown> | null;
  computed_at: string; computed_by: string;
}): CalculationRow => ({
  calculationId: x.calculation_id, scope: x.scope as CalculationScope,
  scopeRef: x.scope_ref, scorePct: Number(x.score_pct),
  totalRequirements: Number(x.total_requirements),
  satisfiedRequirements: Number(x.satisfied_requirements),
  partialRequirements: Number(x.partial_requirements),
  unsatisfiedRequirements: Number(x.unsatisfied_requirements),
  openGaps: Number(x.open_gaps),
  breakdown: x.breakdown ?? {},
  computedAt: x.computed_at, computedBy: x.computed_by,
});

export async function listCalculations(
  client: DbClient,
  input: ListCalculationsInput,
): Promise<{ rows: CalculationRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.scope) { params.push(input.scope); where += ` AND scope = $${params.length}`; }
  if (input.scopeRef) { params.push(input.scopeRef); where += ` AND scope_ref = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_calculations
     WHERE ${where} ORDER BY computed_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_calculations WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getCalculation(
  client: DbClient,
  input: { tenantSchema: string; calculationId: string },
): Promise<CalculationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_calculations
     WHERE calculation_id = $1`,
    [input.calculationId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function getLatestCalculation(
  client: DbClient,
  input: { tenantSchema: string; scope: CalculationScope; scopeRef: string },
): Promise<CalculationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_calculations
     WHERE scope = $1 AND scope_ref = $2
     ORDER BY computed_at DESC LIMIT 1`,
    [input.scope, input.scopeRef],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

/**
 * Deterministic calculation:
 *   score = (satisfied + 0.5 * partial) / total * 100, rounded to 2dp.
 *   Requirement status pulled from `<tenant>.requirements.status`:
 *     `met`        → satisfied
 *     `partial`    → partial
 *     anything else→ unsatisfied
 *   Open gaps counted from `<tenant>.gaps` where status NOT IN ('closed','resolved').
 */
export async function runCalculation(
  client: DbClient,
  input: RunCalculationInput,
): Promise<CalculationRow> {
  assertSchema(input.tenantSchema);
  if (!input.scope || !input.scopeRef) {
    throw Object.assign(new Error('scope, scopeRef required'), { code: 'bad_input' });
  }
  if (!SCOPES.includes(input.scope)) {
    throw Object.assign(new Error(`bad scope: ${input.scope}`), { code: 'bad_scope' });
  }

  const filter = input.scope === 'framework' ? `framework_code = $1`
                : input.scope === 'control'   ? `control_id = $1`
                                              : `workspace_id = $1`;

  const reqAgg = await client.query<{ status: string; n: string }>(
    `SELECT status, COUNT(*)::text AS n
       FROM "${input.tenantSchema}".requirements
      WHERE ${filter}
      GROUP BY status`,
    [input.scopeRef],
  );

  let satisfied = 0, partial = 0, unsatisfied = 0;
  const byStatus: Record<string, number> = {};
  for (const row of reqAgg.rows) {
    const n = Number(row.n);
    byStatus[row.status] = n;
    if (row.status === 'met') satisfied += n;
    else if (row.status === 'partial') partial += n;
    else unsatisfied += n;
  }
  const total = satisfied + partial + unsatisfied;
  const score = total === 0 ? 0
    : Math.round(((satisfied + 0.5 * partial) / total) * 10000) / 100;

  const gapAgg = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n
       FROM "${input.tenantSchema}".gaps
      WHERE ${filter}
        AND status NOT IN ('closed', 'resolved')`,
    [input.scopeRef],
  );
  const openGaps = Number(gapAgg.rows[0]?.n ?? 0);

  const breakdown = { byStatus, formula: 'satisfied + 0.5*partial / total' };

  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_calculations
       (scope, scope_ref, score_pct, total_requirements,
        satisfied_requirements, partial_requirements, unsatisfied_requirements,
        open_gaps, breakdown, computed_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10)
     RETURNING ${COLS}`,
    [
      input.scope, input.scopeRef, score,
      total, satisfied, partial, unsatisfied,
      openGaps, JSON.stringify(breakdown), input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}
