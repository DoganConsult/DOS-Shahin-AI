/**
 * Programs service — tenant-scoped CRUD over `<tenant_schema>.compliance_programs`.
 *
 * status enum: 'active' | 'paused' | 'completed' | 'archived' | 'planned'
 * Default 'active' (matches schema default).
 */
import type { DbClient } from '../../db/runner';

export type ProgramStatus = 'active' | 'paused' | 'completed' | 'archived' | 'planned';

export interface ProgramRow {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  programType: string;
  status: ProgramStatus;
  ownerId: string | null;
  startDate: string | null;
  endDate: string | null;
  budget: string | number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListProgramsInput {
  tenantSchema: string;
  tenantId: string;
  programType?: string;
  status?: ProgramStatus;
  ownerId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateProgramInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  name: string;
  programType: string;
  description?: string | null;
  status?: ProgramStatus;
  ownerId?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  budget?: number | null;
}

export interface UpdateProgramStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: ProgramStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<ProgramStatus> = new Set([
  'active', 'paused', 'completed', 'archived', 'planned',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is ProgramStatus {
  if (!STATUSES.has(s as ProgramStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, name, description, program_type, status,
              owner_id, start_date, end_date, budget,
              created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; name: string;
  description: string | null; program_type: string;
  status: ProgramStatus; owner_id: string | null;
  start_date: string | null; end_date: string | null;
  budget: string | number | null;
  created_at: string; updated_at: string;
}): ProgramRow => ({
  id: x.id, tenantId: x.tenant_id, name: x.name,
  description: x.description, programType: x.program_type,
  status: x.status, ownerId: x.owner_id,
  startDate: x.start_date, endDate: x.end_date, budget: x.budget,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listPrograms(
  client: DbClient,
  input: ListProgramsInput,
): Promise<{ rows: ProgramRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.programType) { params.push(input.programType); where += ` AND program_type = $${params.length}`; }
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.ownerId) { params.push(input.ownerId); where += ` AND owner_id = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_programs
     WHERE ${where} ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_programs WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getProgram(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ProgramRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_programs
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createProgram(
  client: DbClient,
  input: CreateProgramInput,
): Promise<ProgramRow> {
  assertSchema(input.tenantSchema);
  if (!input.name || !input.programType) {
    throw Object.assign(new Error('name and programType required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  if (input.budget !== undefined && input.budget !== null) {
    if (typeof input.budget !== 'number' || Number.isNaN(input.budget) || input.budget < 0) {
      throw Object.assign(new Error('budget must be a non-negative number'), { code: 'bad_input' });
    }
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_programs
       (tenant_id, name, description, program_type, status,
        owner_id, start_date, end_date, budget)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.name, input.description ?? null,
      input.programType, input.status ?? 'active',
      input.ownerId ?? null,
      input.startDate ?? null, input.endDate ?? null,
      input.budget ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateProgramStatus(
  client: DbClient,
  input: UpdateProgramStatusInput,
): Promise<ProgramRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_programs
        SET status = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
