"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWorkspaces = void 0;
exports.assertTenantAccess = assertTenantAccess;
exports.getWorkspaceContext = getWorkspaceContext;
exports.getDefaultWorkspace = getDefaultWorkspace;
exports.listWorkspaces = listWorkspaces;
exports.createWorkspace = createWorkspace;
exports.updateWorkspace = updateWorkspace;
exports.deleteWorkspace = deleteWorkspace;
exports.getScopeDimensions = getScopeDimensions;
exports.createScopeDimension = createScopeDimension;
const db_1 = require("@dos/db");
async function validateTenantMembership(userId, tenantId) {
    const result = await (0, db_1.safeQuery)(`SELECT 1 FROM tenant_user_memberships WHERE user_id = $1 AND tenant_id = $2 AND status = 'active' LIMIT 1`, [userId, tenantId]);
    return result.rows.length > 0;
}
async function assertTenantAccess(userId, tenantId) {
    const isMember = await validateTenantMembership(userId, tenantId);
    if (!isMember) {
        const err = new Error('Workspace access denied: caller is not a member of this tenant');
        err.statusCode = 403;
        throw err;
    }
}
async function getWorkspaceContext(tenantId, workspaceId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE workspace_id = $1 AND tenant_id = $2 LIMIT 1`, [workspaceId, tenantId]);
    if (!rows[0])
        return null;
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
async function getDefaultWorkspace(tenantId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE tenant_id = $1 AND type = 'default' LIMIT 1`, [tenantId]);
    if (!rows[0])
        return null;
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
async function listWorkspaces(tenantId) {
    const { rows } = await (0, db_1.safeQuery)(`SELECT workspace_id, tenant_id, name, type, is_active, settings, created_at
     FROM workspaces WHERE tenant_id = $1 ORDER BY created_at`, [tenantId]);
    return rows.map((r) => ({
        workspaceId: r.workspace_id,
        tenantId: r.tenant_id,
        name: r.name,
        type: r.type ?? 'default',
        isActive: r.is_active !== false,
        settings: r.settings ?? {},
        createdAt: typeof r.created_at === 'string' ? r.created_at : String(r.created_at ?? ''),
    }));
}
/** Compat alias for listWorkspaces */
exports.getWorkspaces = listWorkspaces;
async function createWorkspace(tenantId, name, type, createdBy) {
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO workspaces (tenant_id, name, type, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     RETURNING workspace_id, created_at`, [tenantId, name, type, createdBy]);
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
async function updateWorkspace(tenantId, workspaceId, data) {
    const sets = [];
    const params = [];
    let idx = 1;
    if (data.name !== undefined) {
        sets.push(`name = $${idx++}`);
        params.push(data.name);
    }
    if (data.type !== undefined) {
        sets.push(`type = $${idx++}`);
        params.push(data.type);
    }
    if (data.is_active !== undefined) {
        sets.push(`is_active = $${idx++}`);
        params.push(data.is_active);
    }
    if (data.settings !== undefined) {
        sets.push(`settings = $${idx++}`);
        params.push(JSON.stringify(data.settings));
    }
    sets.push('updated_at = NOW()');
    params.push(workspaceId, tenantId);
    const { rows } = await (0, db_1.safeQuery)(`UPDATE workspaces SET ${sets.join(', ')} WHERE workspace_id = $${idx++} AND tenant_id = $${idx} RETURNING *`, params);
    if (rows.length === 0)
        throw new Error('Workspace not found');
    return rows[0];
}
async function deleteWorkspace(tenantId, workspaceId) {
    const { rowCount } = await (0, db_1.safeQuery)(`DELETE FROM workspaces WHERE workspace_id = $1 AND tenant_id = $2`, [workspaceId, tenantId]);
    return (rowCount ?? 0) > 0;
}
async function getScopeDimensions(tenantId, workspaceId, type) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".scope_dimensions WHERE workspace_id = $1`;
    const params = [workspaceId];
    if (type) {
        sql += ` AND type = $2`;
        params.push(type);
    }
    sql += ' ORDER BY name';
    const { rows } = await (0, db_1.safeQuery)(sql, params);
    return rows;
}
async function createScopeDimension(tenantId, data) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const { rows } = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".scope_dimensions (workspace_id, type, name, parent_id)
     VALUES ($1, $2, $3, $4) RETURNING *`, [data.workspace_id, data.type, data.name, data.parent_id || null]);
    return rows[0];
}
//# sourceMappingURL=workspace.service.js.map