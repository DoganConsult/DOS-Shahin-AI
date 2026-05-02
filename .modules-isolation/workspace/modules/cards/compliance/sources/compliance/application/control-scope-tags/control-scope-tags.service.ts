/**
 * Control-Scope-Tags service — per-(control, scope) in-scope flag with sign-off
 * over `<tenant_schema>.control_scope_tags`. UNIQUE(control_id, scope) → upsert.
 */
import type { DbClient } from '../../db/runner';

export interface ControlScopeTagRow {
  tagId: string;
  controlId: string;
  scope: string;
  inScope: boolean;
  signedOffBy: string | null;
  signedOffAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListScopeTagsInput {
  tenantSchema: string;
  controlId?: string;
  scope?: string;
  inScope?: boolean;
  limit?: number;
  offset?: number;
}

export interface UpsertScopeTagInput {
  tenantSchema: string;
  actorId: string;
  controlId: string;
  scope: string;
  inScope?: boolean;
  notes?: string | null;
}

export interface SignOffScopeTagInput {
  tenantSchema: string;
  actorId: string;
  tagId: string;
  signedOffBy?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `tag_id, control_id, scope, in_scope, signed_off_by, signed_off_at,
              notes, created_at, updated_at`;

const mapRow = (x: {
  tag_id: string; control_id: string; scope: string; in_scope: boolean;
  signed_off_by: string | null; signed_off_at: string | null; notes: string | null;
  created_at: string; updated_at: string;
}): ControlScopeTagRow => ({
  tagId: x.tag_id, controlId: x.control_id, scope: x.scope, inScope: x.in_scope,
  signedOffBy: x.signed_off_by, signedOffAt: x.signed_off_at, notes: x.notes,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listScopeTags(
  client: DbClient,
  input: ListScopeTagsInput,
): Promise<{ rows: ControlScopeTagRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.scope) { params.push(input.scope); where += ` AND scope = $${params.length}`; }
  if (input.inScope !== undefined) { params.push(input.inScope); where += ` AND in_scope = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_scope_tags
     WHERE ${where} ORDER BY control_id ASC, scope ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".control_scope_tags WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getScopeTag(
  client: DbClient,
  input: { tenantSchema: string; tagId: string },
): Promise<ControlScopeTagRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_scope_tags
     WHERE tag_id = $1`,
    [input.tagId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function upsertScopeTag(
  client: DbClient,
  input: UpsertScopeTagInput,
): Promise<ControlScopeTagRow> {
  assertSchema(input.tenantSchema);
  if (!input.controlId || !input.scope) {
    throw Object.assign(new Error('controlId, scope required'), { code: 'bad_input' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".control_scope_tags
       (control_id, scope, in_scope, notes)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (control_id, scope) DO UPDATE
       SET in_scope = EXCLUDED.in_scope,
           notes = EXCLUDED.notes,
           updated_at = NOW()
     RETURNING ${COLS}`,
    [
      input.controlId, input.scope,
      input.inScope ?? true,
      input.notes ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function signOffScopeTag(
  client: DbClient,
  input: SignOffScopeTagInput,
): Promise<ControlScopeTagRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".control_scope_tags
        SET signed_off_by = $2, signed_off_at = NOW(), updated_at = NOW()
      WHERE tag_id = $1
      RETURNING ${COLS}`,
    [input.tagId, input.signedOffBy ?? input.actorId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteScopeTag(
  client: DbClient,
  input: { tenantSchema: string; tagId: string },
): Promise<ControlScopeTagRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".control_scope_tags
      WHERE tag_id = $1
      RETURNING ${COLS}`,
    [input.tagId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
