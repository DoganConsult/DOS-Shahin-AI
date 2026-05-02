/**
 * Sectors service — industry sector taxonomy (banking, telecom, healthcare,
 * energy, government, etc.) over `<tenant_schema>.sectors`. Powers
 * framework selection and sector-specific obligation packs.
 */
import type { DbClient } from '../../db/runner';

export type SectorStatus = 'active' | 'inactive';
const STATUSES: ReadonlyArray<SectorStatus> = ['active', 'inactive'];

export interface SectorRow {
  sectorId: string;
  code: string;
  name: string;
  description: string | null;
  status: SectorStatus;
  createdAt: string;
}

export interface ListSectorsInput {
  tenantSchema: string;
  status?: SectorStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateSectorInput {
  tenantSchema: string;
  actorId: string;
  code: string;
  name: string;
  description?: string;
  status?: SectorStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `sector_id, code, name, description, status, created_at`;

const mapRow = (x: {
  sector_id: string; code: string; name: string;
  description: string | null; status: string; created_at: string;
}): SectorRow => ({
  sectorId: x.sector_id, code: x.code, name: x.name,
  description: x.description, status: x.status as SectorStatus,
  createdAt: x.created_at,
});

export async function listSectors(
  client: DbClient,
  input: ListSectorsInput,
): Promise<{ rows: SectorRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".sectors
     WHERE ${where} ORDER BY name ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".sectors WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getSector(
  client: DbClient,
  input: { tenantSchema: string; sectorId: string },
): Promise<SectorRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".sectors WHERE sector_id = $1`,
    [input.sectorId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createSector(
  client: DbClient,
  input: CreateSectorInput,
): Promise<SectorRow> {
  assertSchema(input.tenantSchema);
  if (!input.code || !input.name) {
    throw Object.assign(new Error('code, name required'), { code: 'bad_input' });
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".sectors (code, name, description, status)
     VALUES ($1, $2, $3, $4) RETURNING ${COLS}`,
    [input.code, input.name, input.description ?? null, input.status ?? 'active'],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteSector(
  client: DbClient,
  input: { tenantSchema: string; sectorId: string },
): Promise<SectorRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".sectors
      WHERE sector_id = $1 RETURNING ${COLS}`,
    [input.sectorId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
