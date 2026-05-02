import { safeQuery, tenantSchema } from '@dos/db';
async function validateTenantMembership(userId: string, tenantId: string): Promise<boolean> {
  const result = await safeQuery(
    `SELECT 1 FROM tenant_user_memberships WHERE user_id = $1 AND tenant_id = $2 AND status = 'active' LIMIT 1`,
    [userId, tenantId],
  );
  return result.rows.length > 0;
}
export async function assertTenantAccess(userId: string, tenantId: string): Promise<void> {
  const isMember = await validateTenantMembership(userId, tenantId);
  if (!isMember) {
    const err = new Error('Workspace access denied: caller is not a member of this tenant') as Error & { statusCode: number };
    err.statusCode = 403;
    throw err;
  }
}
export interface WorkspaceContext {
  workspaceId: string;
  tenantId: string;
  name: string;
  type: 'default' | 'project' | 'sandbox';
  isActive: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
}
export async function getWorkspaceContext(
  tenantId: string,
  workspaceId: string,
): Promise<WorkspaceContext | null> {
  const { rows } = await safeQuery(
    `SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE workspace_id = $1 AND tenant_id = $2 LIMIT 1`,
    [workspaceId, tenantId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    workspaceId: r.workspace_id,
    tenantId: r.tenant_id,
    name: r.name,
    type: r.type ?? 'default',
    isActive: r.is_active !== false,
    settings: r.settings ?? {},
    createdAt: r.created_at?.toISOString?.() ?? '',
  };
}
export async function getDefaultWorkspace(tenantId: string): Promise<WorkspaceContext | null> {
  const { rows } = await safeQuery(
    `SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE tenant_id = $1 AND type = 'default' LIMIT 1`,
    [tenantId],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    workspaceId: r.workspace_id,
    tenantId: r.tenant_id,
    name: r.name,
    type: 'default',
    isActive: r.is_active !== false,
    settings: r.settings ?? {},
    createdAt: r.created_at?.toISOString?.() ?? '',
  };
}
export async function listWorkspaces(tenantId: string): Promise<WorkspaceContext[]> {
  const { rows } = await safeQuery(
    `SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE tenant_id = $1 ORDER BY created_at`,
    [tenantId],
  );
  return rows.map((r: Record<string, any>) => ({
    workspaceId: r.workspace_id as string,
    tenantId: r.tenant_id as string,
    name: r.name as string,
    type: (r.type as WorkspaceContext['type']) ?? 'default',
    isActive: r.is_active !== false,
    settings: (r.settings as Record<string, unknown>) ?? {},
    createdAt: typeof r.created_at === 'string' ? r.created_at : String(r.created_at ?? ''),
  }));
}
/** Compat alias for listWorkspaces */
export const getWorkspaces = listWorkspaces;
export async function createWorkspace(
  tenantId: string,
  name: string,
  type: 'default' | 'project' | 'sandbox',
  createdBy: string,
): Promise<WorkspaceContext> {
  const { rows } = await safeQuery(
    `INSERT INTO workspaces (tenant_id, name, type, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING workspace_id, created_at`,
    [tenantId, name, type, createdBy],
  );
  return {
    workspaceId: rows[0].workspace_id,
    tenantId,
    name,
    type,
    isActive: true,
    settings: {},
    createdAt: rows[0].created_at?.toISOString?.() ?? new Date().toISOString(),
  };
}
export async function updateWorkspace(
  tenantId: string,
  workspaceId: string,
  data: { name?: string; type?: string; is_active?: boolean; settings?: Record<string, unknown> },
): Promise<Record<string, unknown>> {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (data.name !== undefined) { sets.push(`name = $${idx++}`); params.push(data.name); }
  if (data.type !== undefined) { sets.push(`type = $${idx++}`); params.push(data.type); }
  if (data.is_active !== undefined) { sets.push(`is_active = $${idx++}`); params.push(data.is_active); }
  if (data.settings !== undefined) { sets.push(`settings = $${idx++}`); params.push(JSON.stringify(data.settings)); }
  sets.push('updated_at = NOW()');
  params.push(workspaceId, tenantId);
  const { rows } = await safeQuery(
    `UPDATE workspaces SET ${sets.join(', ')} WHERE workspace_id = $${idx++} AND tenant_id = $${idx} RETURNING *`,
    params,
  );
  if (rows.length === 0) throw new Error('Workspace not found');
  return rows[0] as Record<string, unknown>;
}
export async function deleteWorkspace(
  tenantId: string,
  workspaceId: string,
): Promise<boolean> {
  const { rowCount } = await safeQuery(
    `DELETE FROM workspaces WHERE workspace_id = $1 AND tenant_id = $2`,
    [workspaceId, tenantId],
  );
  return (rowCount ?? 0) > 0;
}
// ── Scope Dimensions ──────────────────────────────────────────────────────
export interface ScopeDimension {
  dimension_id: string;
  workspace_id: string;
  type: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}
export async function getScopeDimensions(
  tenantId: string,
  workspaceId: string,
  type?: string,
): Promise<ScopeDimension[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".scope_dimensions WHERE workspace_id = $1`;
  const params: unknown[] = [workspaceId];
  if (type) { sql += ` AND type = $2`; params.push(type); }
  sql += ' ORDER BY name';
  const { rows } = await safeQuery(sql, params);
  return rows as ScopeDimension[];
}
export async function createScopeDimension(
  tenantId: string,
  data: { workspace_id: string; type: string; name: string; parent_id?: string },
): Promise<ScopeDimension> {
  const schema = tenantSchema(tenantId);
  const { rows } = await safeQuery(
    `INSERT INTO "${schema}".scope_dimensions (workspace_id, type, name, parent_id)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [data.workspace_id, data.type, data.name, data.parent_id || null],
  );
  return rows[0] as ScopeDimension;
}
