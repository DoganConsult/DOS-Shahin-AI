/**
 * Framework-Sector-Applicability service — declares whether a framework
 * (NCA ECC-2, SAMA CSF, PDPL, etc.) applies to a sector
 * (banking, telecom, healthcare, etc.) over
 * `<tenant_schema>.framework_sector_applicability`.
 */
import type { DbClient } from '../../db/runner';

export type Applicability = 'mandatory' | 'recommended' | 'optional' | 'not_applicable';
const APPLICABILITIES: ReadonlyArray<Applicability> = [
  'mandatory', 'recommended', 'optional', 'not_applicable',
];

export interface FrameworkSectorApplicabilityRow {
  id: string;
  frameworkCode: string;
  sectorId: string;
  applicability: Applicability;
  notes: string | null;
  createdAt: string;
}

export interface ListFrameworkSectorApplicabilityInput {
  tenantSchema: string;
  frameworkCode?: string;
  sectorId?: string;
  applicability?: Applicability;
  limit?: number;
  offset?: number;
}

export interface CreateFrameworkSectorApplicabilityInput {
  tenantSchema: string;
  actorId: string;
  frameworkCode: string;
  sectorId: string;
  applicability?: Applicability;
  notes?: string;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, framework_code, sector_id, applicability, notes, created_at`;

const mapRow = (x: {
  id: string; framework_code: string; sector_id: string;
  applicability: string; notes: string | null; created_at: string;
}): FrameworkSectorApplicabilityRow => ({
  id: x.id, frameworkCode: x.framework_code, sectorId: x.sector_id,
  applicability: x.applicability as Applicability,
  notes: x.notes, createdAt: x.created_at,
});

export async function listFrameworkSectorApplicability(
  client: DbClient,
  input: ListFrameworkSectorApplicabilityInput,
): Promise<{ rows: FrameworkSectorApplicabilityRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.frameworkCode) { params.push(input.frameworkCode); where += ` AND framework_code = $${params.length}`; }
  if (input.sectorId) { params.push(input.sectorId); where += ` AND sector_id = $${params.length}`; }
  if (input.applicability) { params.push(input.applicability); where += ` AND applicability = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".framework_sector_applicability
     WHERE ${where} ORDER BY framework_code ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".framework_sector_applicability WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getFrameworkSectorApplicability(
  client: DbClient,
  input: { tenantSchema: string; id: string },
): Promise<FrameworkSectorApplicabilityRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".framework_sector_applicability
     WHERE id = $1`,
    [input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createFrameworkSectorApplicability(
  client: DbClient,
  input: CreateFrameworkSectorApplicabilityInput,
): Promise<FrameworkSectorApplicabilityRow> {
  assertSchema(input.tenantSchema);
  if (!input.frameworkCode || !input.sectorId) {
    throw Object.assign(new Error('frameworkCode, sectorId required'), { code: 'bad_input' });
  }
  if (input.applicability && !APPLICABILITIES.includes(input.applicability)) {
    throw Object.assign(new Error(`bad applicability: ${input.applicability}`), { code: 'bad_applicability' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".framework_sector_applicability
       (framework_code, sector_id, applicability, notes)
     VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
    [input.frameworkCode, input.sectorId,
      input.applicability ?? 'mandatory',
      input.notes ?? null],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteFrameworkSectorApplicability(
  client: DbClient,
  input: { tenantSchema: string; id: string },
): Promise<FrameworkSectorApplicabilityRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".framework_sector_applicability
      WHERE id = $1 RETURNING ${COLS}`,
    [input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
