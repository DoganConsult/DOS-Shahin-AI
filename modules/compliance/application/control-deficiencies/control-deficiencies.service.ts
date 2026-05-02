/**
 * Control-Deficiencies service — tenant-schema-scoped CRUD + status transition
 * over `<tenant_schema>.control_deficiencies`.
 *
 * Note: this table is isolated by tenant schema (no tenant_id column).
 */
import type { DbClient } from '../../db/runner';

export type DeficiencyStatus =
  | 'identified' | 'remediation_in_progress' | 'validated' | 'closed';
const DEF_STATUSES: ReadonlyArray<DeficiencyStatus> =
  ['identified', 'remediation_in_progress', 'validated', 'closed'];

export type DeficiencySeverity = 'low' | 'medium' | 'high' | 'critical';
const DEF_SEVERITIES: ReadonlyArray<DeficiencySeverity> = ['low', 'medium', 'high', 'critical'];

export interface ControlDeficiencyRow {
  deficiencyId: string;
  controlId: string;
  title: string;
  description: string | null;
  severity: DeficiencySeverity;
  identifiedBy: string | null;
  status: DeficiencyStatus;
  remediationPlan: string | null;
  remediationOwner: string | null;
  remediationDeadline: string | null;
  closureNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListDeficienciesInput {
  tenantSchema: string;
  controlId?: string;
  status?: DeficiencyStatus;
  severity?: DeficiencySeverity;
  limit?: number;
  offset?: number;
}

export interface CreateDeficiencyInput {
  tenantSchema: string;
  actorId: string;
  controlId: string;
  title: string;
  description?: string | null;
  severity?: DeficiencySeverity;
  identifiedBy?: string | null;
  remediationPlan?: string | null;
  remediationOwner?: string | null;
  remediationDeadline?: string | null;
}

export interface UpdateDeficiencyStatusInput {
  tenantSchema: string;
  actorId: string;
  deficiencyId: string;
  status: DeficiencyStatus;
  closureNotes?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `deficiency_id, control_id, title, description, severity, identified_by,
              status, remediation_plan, remediation_owner, remediation_deadline,
              closure_notes, created_at, updated_at`;

const mapRow = (x: {
  deficiency_id: string; control_id: string; title: string; description: string | null;
  severity: string; identified_by: string | null; status: string;
  remediation_plan: string | null; remediation_owner: string | null;
  remediation_deadline: string | null; closure_notes: string | null;
  created_at: string; updated_at: string;
}): ControlDeficiencyRow => ({
  deficiencyId: x.deficiency_id, controlId: x.control_id, title: x.title,
  description: x.description, severity: x.severity as DeficiencySeverity,
  identifiedBy: x.identified_by, status: x.status as DeficiencyStatus,
  remediationPlan: x.remediation_plan, remediationOwner: x.remediation_owner,
  remediationDeadline: x.remediation_deadline, closureNotes: x.closure_notes,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listDeficiencies(
  client: DbClient,
  input: ListDeficienciesInput,
): Promise<{ rows: ControlDeficiencyRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.controlId) { params.push(input.controlId); where += ` AND control_id = $${params.length}`; }
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.severity) { params.push(input.severity); where += ` AND severity = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_deficiencies
     WHERE ${where} ORDER BY created_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".control_deficiencies WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getDeficiency(
  client: DbClient,
  input: { tenantSchema: string; deficiencyId: string },
): Promise<ControlDeficiencyRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".control_deficiencies
     WHERE deficiency_id = $1`,
    [input.deficiencyId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createDeficiency(
  client: DbClient,
  input: CreateDeficiencyInput,
): Promise<ControlDeficiencyRow> {
  assertSchema(input.tenantSchema);
  if (!input.controlId || !input.title) {
    throw Object.assign(new Error('controlId, title required'), { code: 'bad_input' });
  }
  if (input.severity && !DEF_SEVERITIES.includes(input.severity)) {
    throw Object.assign(new Error(`bad severity: ${input.severity}`), { code: 'bad_severity' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".control_deficiencies
       (control_id, title, description, severity, identified_by,
        remediation_plan, remediation_owner, remediation_deadline)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${COLS}`,
    [
      input.controlId, input.title, input.description ?? null,
      input.severity ?? 'medium',
      input.identifiedBy ?? input.actorId,
      input.remediationPlan ?? null,
      input.remediationOwner ?? null,
      input.remediationDeadline ?? null,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateDeficiencyStatus(
  client: DbClient,
  input: UpdateDeficiencyStatusInput,
): Promise<ControlDeficiencyRow | null> {
  assertSchema(input.tenantSchema);
  if (!DEF_STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".control_deficiencies
        SET status = $2,
            closure_notes = COALESCE($3, closure_notes),
            updated_at = NOW()
      WHERE deficiency_id = $1
      RETURNING ${COLS}`,
    [input.deficiencyId, input.status, input.closureNotes ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteDeficiency(
  client: DbClient,
  input: { tenantSchema: string; deficiencyId: string },
): Promise<ControlDeficiencyRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".control_deficiencies
      WHERE deficiency_id = $1
      RETURNING ${COLS}`,
    [input.deficiencyId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
