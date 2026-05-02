/**
 * Workspaces service — multi-workspace scoping per tenant for very-large
 * groups, over `<tenant_schema>.workspaces`. Supports parent/child hierarchy
 * (e.g., Group → Region → Subsidiary) with status lifecycle.
 */
import type { DbClient } from '../../db/runner';

export type WorkspaceStatus = 'active' | 'inactive' | 'archived';
const STATUSES: ReadonlyArray<WorkspaceStatus> = ['active', 'inactive', 'archived'];

export interface WorkspaceRow {
  workspaceId: string;
  code: string;
  name: string;
  description: string | null;
  status: WorkspaceStatus;
  parentWorkspaceId: string | null;
  ownerUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListWorkspacesInput {
  tenantSchema: string;
  status?: WorkspaceStatus;
  parentWorkspaceId?: string;
  ownerUserId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CreateWorkspaceInput {
  tenantSchema: string;
  actorId: string;
  code: string;
  name: string;
  description?: string;
  status?: WorkspaceStatus;
  parentWorkspaceId?: string;
  ownerUserId?: string;
}

export interface UpdateWorkspaceStatusInput {
  tenantSchema: string;
  actorId: string;
  workspaceId: string;
  status: WorkspaceStatus;
}

const SCHEMA_RE = /^tenant_[A-Za-z0-9_]+$/;

function assertSchema(s: string): void {
  if (!SCHEMA_RE.test(s)) throw Object.assign(new Error(`bad_schema:${s}`), { code: 'bad_schema' });
}

const COLS = `workspace_id, code, name, description, status,
              parent_workspace_id, owner_user_id, created_at, updated_at`;

const mapRow = (x: {
  workspace_id: string; code: string; name: string; description: string | null;
  status: string; parent_workspace_id: string | null; owner_user_id: string | null;
  created_at: string; updated_at: string;
}): WorkspaceRow => ({
  workspaceId: x.workspace_id, code: x.code, name: x.name, description: x.description,
  status: x.status as WorkspaceStatus,
  parentWorkspaceId: x.parent_workspace_id, ownerUserId: x.owner_user_id,
  createdAt: x.created_at, updatedAt: x.updated_at,
});

export async function listWorkspaces(
  client: DbClient,
  input: ListWorkspacesInput,
): Promise<{ rows: WorkspaceRow[]; total: number }> {
  assertSchema(input.tenantSchema);
  const limit = Math.min(Math.max(input.limit ?? 100, 1), 500);
  const offset = Math.max(input.offset ?? 0, 0);
  const params: unknown[] = [];
  let where = `1=1`;
  if (input.status) { params.push(input.status); where += ` AND status = $${params.length}`; }
  if (input.parentWorkspaceId) { params.push(input.parentWorkspaceId); where += ` AND parent_workspace_id = $${params.length}`; }
  if (input.ownerUserId) { params.push(input.ownerUserId); where += ` AND owner_user_id = $${params.length}`; }
  if (input.search) {
    params.push(`%${input.search}%`);
    where += ` AND name ILIKE $${params.length}`;
  }
  const rows = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".workspaces
     WHERE ${where} ORDER BY name ASC
     LIMIT ${limit} OFFSET ${offset}`,
    params,
  );
  const totalR = await client.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM "${input.tenantSchema}".workspaces WHERE ${where}`,
    params,
  );
  return { rows: rows.rows.map(mapRow as never), total: Number(totalR.rows[0]?.n ?? 0) };
}

export async function getWorkspace(
  client: DbClient,
  input: { tenantSchema: string; workspaceId: string },
): Promise<WorkspaceRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `SELECT ${COLS} FROM "${input.tenantSchema}".workspaces
     WHERE workspace_id = $1`,
    [input.workspaceId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function createWorkspace(
  client: DbClient,
  input: CreateWorkspaceInput,
): Promise<WorkspaceRow> {
  assertSchema(input.tenantSchema);
  if (!input.code || !input.name) {
    throw Object.assign(new Error('code, name required'), { code: 'bad_input' });
  }
  if (input.status && !STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `INSERT INTO "${input.tenantSchema}".workspaces
       (code, name, description, status, parent_workspace_id, owner_user_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING ${COLS}`,
    [
      input.code, input.name, input.description ?? null,
      input.status ?? 'active',
      input.parentWorkspaceId ?? null,
      input.ownerUserId ?? input.actorId,
    ],
  );
  return mapRow(r.rows[0] as never);
}

export async function updateWorkspaceStatus(
  client: DbClient,
  input: UpdateWorkspaceStatusInput,
): Promise<WorkspaceRow | null> {
  assertSchema(input.tenantSchema);
  if (!STATUSES.includes(input.status)) {
    throw Object.assign(new Error(`bad status: ${input.status}`), { code: 'bad_status' });
  }
  const r = await client.query(
    `UPDATE "${input.tenantSchema}".workspaces
        SET status = $2, updated_at = NOW()
      WHERE workspace_id = $1
      RETURNING ${COLS}`,
    [input.workspaceId, input.status],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}

export async function deleteWorkspace(
  client: DbClient,
  input: { tenantSchema: string; workspaceId: string },
): Promise<WorkspaceRow | null> {
  assertSchema(input.tenantSchema);
  const r = await client.query(
    `DELETE FROM "${input.tenantSchema}".workspaces
      WHERE workspace_id = $1
      RETURNING ${COLS}`,
    [input.workspaceId],
  );
  if (r.rowCount === 0) return null;
  return mapRow(r.rows[0] as never);
}
