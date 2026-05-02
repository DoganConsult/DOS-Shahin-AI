/**
 * SoD-Conflict-Matrix service — segregation-of-duties role-pair conflict catalog over
 * `<tenant_schema>.sod_conflict_matrix`.
 */
import type { DbClient } from '../../db/runner';

export type SodConflictType = 'forbidden' | 'requires_approval' | 'requires_review';
const TYPES: ReadonlyArray<SodConflictType> = ['forbidden', 'requires_approval', 'requires_review'];

export type SodSeverity = 'low' | 'medium' | 'high' | 'critical';
const SEVERITIES: ReadonlyArray<SodSeverity> = ['low', 'medium', 'high', 'critical'];

export interface SodConflictRow {
  id: string;
  roleA: string;
  roleB: string;
  conflictType: SodConflictType;
  severity: SodSeverity;
  tenantId: string | null;
  createdAt: string;
}

export interface ListSodConflictsInput {
  tenantSchema: string;
  roleA?: string;
  roleB?: string;
  conflictType?: SodConflictType;
  severity?: SodSeverity;
  limit?: number;
  offset?: number;
}

export interface CreateSodConflictInput {
  tenantSchema: string;
  actorId: string;
  tenantId: string;
  roleA: string;
  roleB: string;
  conflictType?: SodConflictType;
  severity?: SodSeverity;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `id, role_a, role_b, conflict_type, severity, tenant_id, created_at`;

const mapRow = (x: {
  id: string; role_a: string; role_b: string;
  conflict_type: string; severity: string;
  tenant_id: string | null; created_at: string;
}): SodConflictRow => ({
  id: x.id, roleA: x.role_a, roleB: x.role_b,
  conflictType: x.conflict_type as SodConflictType,
  severity: x.severity as SodSeverity,
  tenantId: x.tenant_id, createdAt: x.created_at,
});

export async function listSodConflicts(
  client: DbClient,
  input: ListSodConflictsInput,
): Promise<{ rows: SodConflictRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.roleA) { params.push(input.roleA); where += ` AND role_a = $${params.length}`; }
  if (input.roleB) { params.push(input.roleB); where += ` AND role_b = $${params.length}`; }
  if (input.conflictType) { params.push(input.conflictType); where += ` AND conflict_type = $${params.length}`; }
  if (input.severity) { params.push(input.severity); where += ` AND severity = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".sod_conflict_matrix
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".sod_conflict_matrix WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getSodConflict(
  client: DbClient,
  input: { tenantSchema: string; id: string },
): Promise<SodConflictRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".sod_conflict_matrix
     WHERE id = $1`,
    [input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createSodConflict(
  client: DbClient,
  input: CreateSodConflictInput,
): Promise<SodConflictRow> {
  assertSchema(input.tenantSchema);
  if (!input.roleA || !input.roleB) {
    throw Object.assign(new Error('roleA, roleB required'), { code: 'bad_input' });
  }
  if (input.roleA === input.roleB) {
    throw Object.assign(new Error('roleA and roleB must differ'), { code: 'bad_input' });
  }
  if (input.conflictType && !TYPES.includes(input.conflictType)) {
    throw Object.assign(new Error(`bad conflict_type: ${input.conflictType}`), { code: 'bad_type' });
  }
  if (input.severity && !SEVERITIES.includes(input.severity)) {
    throw Object.assign(new Error(`bad severity: ${input.severity}`), { code: 'bad_severity' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".sod_conflict_matrix
       (role_a, role_b, conflict_type, severity, tenant_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING ${COLS}`,
    [
      input.roleA, input.roleB,
      input.conflictType ?? 'forbidden',
      input.severity ?? 'high',
      input.tenantId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function deleteSodConflict(
  client: DbClient,
  input: { tenantSchema: string; id: string },
): Promise<SodConflictRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".sod_conflict_matrix
      WHERE id = $1
      RETURNING ${COLS}`,
    [input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
