/**
 * Regulatory Changes service — tenant-scoped CRUD over `<tenant_schema>.compliance_regulatory_changes`.
 *
 * status enum: 'new' | 'under_review' | 'in_progress' | 'implemented' | 'dismissed'
 * Default status 'new' (matches schema default).
 */
import type { DbClient } from '../../db/runner';

export type RegulatoryChangeStatus =
  | 'new' | 'under_review' | 'in_progress' | 'implemented' | 'dismissed';

export interface RegulatoryChangeRow {
  id: string;
  tenantId: string;
  regulationName: string;
  changeType: string;
  description: string | null;
  effectiveDate: string | null;
  impactAssessment: string | null;
  status: RegulatoryChangeStatus;
  assignedTo: string | null;
  actionItems: unknown[];
  createdAt: string;
  updatedAt: string;
}

export interface ListRegulatoryChangesInput {
  tenantSchema: string;
  tenantId: string;
  regulationName?: string;
  changeType?: string;
  status?: RegulatoryChangeStatus;
  assignedTo?: string;
  limit?: number;
  offset?: number;
}

export interface CreateRegulatoryChangeInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  regulationName: string;
  changeType: string;
  description?: string | null;
  effectiveDate?: string | null;
  impactAssessment?: string | null;
  status?: RegulatoryChangeStatus;
  assignedTo?: string | null;
  actionItems?: unknown[];
}

export interface UpdateRegulatoryChangeStatusInput {
  tenantSchema: string;
  tenantId: string;
  actorId: string;
  id: string;
  status: RegulatoryChangeStatus;
  assignedTo?: string | null;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;
const STATUSES: ReadonlySet<RegulatoryChangeStatus> = new Set([
  'new', 'under_review', 'in_progress', 'implemented', 'dismissed',
]);

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}
function assertStatus(s: string): asserts s is RegulatoryChangeStatus {
  if (!STATUSES.has(s as RegulatoryChangeStatus)) throw Object.assign(new Error(`bad_status:${s}`), { code: 'bad_status' });
}

const COLS = `id, tenant_id, regulation_name, change_type, description,
              effective_date, impact_assessment, status, assigned_to,
              action_items, created_at, updated_at`;

const mapRow = (x: {
  id: string; tenant_id: string; regulation_name: string; change_type: string;
  description: string | null; effective_date: string | null;
  impact_assessment: string | null; status: RegulatoryChangeStatus;
  assigned_to: string | null; action_items: unknown[];
  created_at: string; updated_at: string;
}): RegulatoryChangeRow => ({
  id: x.id, tenantId: x.tenant_id, regulationName: x.regulation_name,
  changeType: x.change_type, description: x.description,
  effectiveDate: x.effective_date, impactAssessment: x.impact_assessment,
  status: x.status, assignedTo: x.assigned_to,
  actionItems: x.action_items ?? [],
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listRegulatoryChanges(
  client: DbClient,
  input: ListRegulatoryChangesInput,
): Promise<{ rows: RegulatoryChangeRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 25, 1), 200);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [input.tenantId];
  let where = `tenant_id = $1`;
  if (input.regulationName) { params.push(input.regulationName); where += ` AND regulation_name = $${params.length}`; }
  if (input.changeType) { params.push(input.changeType); where += ` AND change_type = $${params.length}`; }
  if (input.status) { assertStatus(input.status); params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.assignedTo) { params.push(input.assignedTo); where += ` AND assigned_to = $${params.length}`; }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_regulatory_changes
     WHERE ${where} ORDER BY updated_at DESC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".compliance_regulatory_changes WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getRegulatoryChange(
  client: DbClient,
  input: { tenantSchema: string; tenantId: string; id: string },
): Promise<RegulatoryChangeRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".compliance_regulatory_changes
     WHERE tenant_id = $1 AND id = $2`,
    [input.tenantId, input.id],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createRegulatoryChange(
  client: DbClient,
  input: CreateRegulatoryChangeInput,
): Promise<RegulatoryChangeRow> {
  assertSchema(input.tenantSchema);
  if (!input.regulationName || !input.changeType) {
    throw Object.assign(new Error('regulationName and changeType required'), { code: 'bad_input' });
  }
  if (input.status) assertStatus(input.status);
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".compliance_regulatory_changes
       (tenant_id, regulation_name, change_type, description,
        effective_date, impact_assessment, status, assigned_to, action_items)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb)
     RETURNING ${COLS}`,
    [
      input.tenantId, input.regulationName, input.changeType,
      input.description ?? null, input.effectiveDate ?? null,
      input.impactAssessment ?? null, input.status ?? 'new',
      input.assignedTo ?? null, JSON.stringify(input.actionItems ?? []),
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateRegulatoryChangeStatus(
  client: DbClient,
  input: UpdateRegulatoryChangeStatusInput,
): Promise<RegulatoryChangeRow | null> {
  assertSchema(input.tenantSchema);
  assertStatus(input.status);
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".compliance_regulatory_changes
        SET status = $3,
            assigned_to = COALESCE($4, assigned_to),
            updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING ${COLS}`,
    [input.tenantId, input.id, input.status, input.assignedTo ?? null],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
