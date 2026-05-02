/**
 * KPIs service — tenant-scoped CRUD over `<tenant_schema>.compliance_kpis`.
 *
 * trend enum (free-form text in DB; we constrain to a known set): 'up' | 'down' | 'flat' | 'unknown'
 * Snapshots are mutable via `recordKpiValue` which updates current_value, trend, and computed_at.
 */
import type { DbClient } from '../../db/runner';

export type KpiTrend = 'up' | 'down' | 'flat' | 'unknown';

export interface KpiRow {
  id: string;
  tenantId: string;
  kpiCode: string;
  name: string;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  trend: KpiTrend | null;
  computedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ListKpisInput {
  tenantSchema: string;
  tenantId: string;
  kpiCode?: string;
  trend?: KpiTrend;
  limit?: number;
  offset?: number;
}

export interface CreateKpiInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  kpiCode: string;
  name: string;
  currentValue?: number | null;
  targetValue?: number | null;
  unit?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  trend?: KpiTrend | null;
}

export interface RecordKpiValueInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  currentValue: number;
  trend?: KpiTrend;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const TRENDS: ReadonlySet<KpiTrend> = new Set(['up', 'down', 'flat', 'unknown']);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertTrend(s: string): asserts s is KpiTrend {
  if (!TRENDS.has(s as KpiTrend)) throw Object.assign(new Error(`bad_trend:${s}`), { code: 'bad_trend' });
}

const COLS = `id, tenant_id, kpi_code, name, current_value, target_value,
              unit, period_start, period_end, trend, computed_at,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; kpi_code: string; name: string;
  current_value: string | number | null; target_value: string | number | null;
  unit: string | null; period_start: string | null; period_end: string | null;
  trend: KpiTrend | null; computed_at: string;
  created_at: string; updated_at: string;
}): KpiRow => ({
  id: x.id, tenantId: x.tenant_id, kpiCode: x.kpi_code, name: x.name,
  currentValue: x.current_value === null ? null : Number(x.current_value),
  targetValue: x.target_value === null ? null : Number(x.target_value),
  unit: x.unit, periodStart: x.period_start, periodEnd: x.period_end,
  trend: x.trend, computedAt: x.computed_at,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listKpis(
  client: DbClient,
  input: ListKpisInput,
): Promise<{ rows: KpiRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.kpiCode) { params.push(input.kpiCode); where += ` AND kpi_code = $${params.length}`; }
  if (input.trend) { assertTrend(input.trend); params.push(input.trend); where += ` AND trend = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_kpis
     WHERE ${where} ORDER BY computed_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_kpis WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getKpi(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<KpiRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_kpis
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createKpi(
  client: DbClient,
  input: CreateKpiInput,
): Promise<KpiRow> {
  assertSchema(input.tenantSchema);
  if (!input.kpiCode || !input.name) {
    throw Object.assign(new Error('kpiCode and name required'), { code: 'bad_input' });
  }
  if (input.trend) assertTrend(input.trend);
  if (input.currentValue !== undefined && input.currentValue !== null
      && (typeof input.currentValue !== 'number' || Number.isNaN(input.currentValue))) {
    throw Object.assign(new Error('currentValue must be a number'), { code: 'bad_input' });
  }
  if (input.targetValue !== undefined && input.targetValue !== null
      && (typeof input.targetValue !== 'number' || Number.isNaN(input.targetValue))) {
    throw Object.assign(new Error('targetValue must be a number'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_kpis
       (tenant_id, kpi_code, name, current_value, target_value,
        unit, period_start, period_end, trend)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.kpiCode, input.name,
      input.currentValue ?? null, input.targetValue ?? null,
      input.unit ?? null, input.periodStart ?? null, input.periodEnd ?? null,
      input.trend ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function recordKpiValue(
  client: DbClient,
  input: RecordKpiValueInput,
): Promise<KpiRow | null> {
  assertSchema(input.tenantSchema);
  if (typeof input.currentValue !== 'number' || Number.isNaN(input.currentValue)) {
    throw Object.assign(new Error('currentValue must be a number'), { code: 'bad_input' });
  }
  if (input.trend) assertTrend(input.trend);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_kpis
        SET current_value = $3,
            trend = COALESCE($4, trend),
            computed_at = NOW(),
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.currentValue, input.trend ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
