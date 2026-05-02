/**
 * Obligations service — tenant-scoped CRUD over `<tenant_schema>.compliance_obligations`.
 *
 * Same discipline as W9/W10: strict `tenant_<id>` schema regex, never embeds
 * the schema as user data. Status enum constrained to ('active','met','overdue','waived').
 */
import type { DbClient } from '../../db/runner';

export type ObligationStatus = 'active' | 'met' | 'overdue' | 'waived';

export interface ObligationRow {
  id: string;
  tenantId: string;
  frameworkId: string | null;
  obligationRef: string;
  title: string;
  description: string | null;
  obligationType: string;
  frequency: string | null;
  dueDate: string | null;
  ownerId: string | null;
  status: ObligationStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ListObligationsInput {
  tenantSchema: string;
  tenantId: string;
  status?: ObligationStatus;
  frameworkId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateObligationInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  frameworkId?: string | null;
  obligationRef: string;
  title: string;
  description?: string | null;
  obligationType?: string;
  frequency?: string | null;
  dueDate?: string | null;
  ownerId?: string | null;
  status?: ObligationStatus;
}

export interface UpdateObligationStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: ObligationStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<ObligationStatus> = new Set(['active', 'met', 'overdue', 'waived']);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is ObligationStatus {
  if (!STATUSES.has(s as ObligationStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const mapRow = (x: {
  id: string; tenant_id: string; framework_id: string | null;
  obligation_ref: string; title: string; description: string | null;
  obligation_type: string; frequency: string | null; due_date: string | null;
  owner_id: string | null; status: ObligationStatus;
  created_at: string; updated_at: string;
}): ObligationRow => ({
  id: x.id, tenantId: x.tenant_id, frameworkId: x.framework_id,
  obligationRef: x.obligation_ref, title: x.title, description: x.description,
  obligationType: x.obligation_type, frequency: x.frequency, dueDate: x.due_date,
  ownerId: x.owner_id, status: x.status,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

const COLS = `id, tenant_id, framework_id, obligation_ref, title, description,
              obligation_type, frequency, due_date, owner_id, status,
              created_at, updated_at`;

export async function listObligations(
  client: DbClient,
  input: ListObligationsInput,
): Promise<{ rows: ObligationRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.frameworkId) { params.push(input.frameworkId); where += ` AND framework_id = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND (obligation_ref ILIKE $${params.length} OR title ILIKE $${params.length})`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_obligations
     WHERE ${where} ORDER BY due_date NULLS LAST, updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_obligations WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getObligation(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<ObligationRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_obligations
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createObligation(
  client: DbClient,
  input: CreateObligationInput,
): Promise<ObligationRow> {
  assertSchema(input.tenantSchema);
  if (!input.obligationRef || !input.title) {
    throw Object.assign(new Error('obligationRef and title required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_obligations
       (tenant_id, framework_id, obligation_ref, title, description,
        obligation_type, frequency, due_date, owner_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.frameworkId ?? null,
      input.obligationRef, input.title, input.description ?? null,
      input.obligationType ?? 'regulatory',
      input.frequency ?? null, input.dueDate ?? null, input.ownerId ?? null,
      input.status ?? 'active',
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateObligationStatus(
  client: DbClient,
  input: UpdateObligationStatusInput,
): Promise<ObligationRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_obligations
        SET status = $3, updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export const __testing__ = { SCHEMA_RE, STATUSES, assertSchema, assertStatus };
