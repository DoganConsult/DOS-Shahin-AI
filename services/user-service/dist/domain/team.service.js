"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listTeams = listTeams;
exports.getTeamById = getTeamById;
exports.createTeam = createTeam;
exports.updateTeam = updateTeam;
exports.deleteTeam = deleteTeam;
exports.listMembers = listMembers;
exports.addMember = addMember;
exports.removeMember = removeMember;
const node_crypto_1 = require("node:crypto");
const db_1 = require("@dos/db");
const metrics_1 = require("../observability/metrics");
const user_errors_1 = require("./contracts/user-errors");
const TEAM_COLS = `team_id, tenant_id, name, code, description, status, department_id,
  created_by, created_at, updated_at`;
async function listTeams(tenantId, options = {}) {
    const page = options.page || 1;
    const pageSize = options.pageSize || 25;
    const offset = (page - 1) * pageSize;
    const params = [tenantId];
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    if (options.status) {
        params.push(options.status);
        conditions.push(`status = $${params.length}`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const start = Date.now();
    const { total, data } = await (0, db_1.withTenantClient)(tenantId, async (c) => {
        const countResult = await c.query(`SELECT COUNT(*) AS count FROM dos.teams ${where}`, params);
        const listParams = [...params, pageSize, offset];
        const listResult = await c.query(`SELECT ${TEAM_COLS}
         FROM dos.teams ${where}
         ORDER BY created_at DESC
         LIMIT $${listParams.length - 1} OFFSET $${listParams.length}`, listParams);
        return {
            total: parseInt(countResult.rows[0]?.count || '0', 10),
            data: listResult.rows,
        };
    });
    metrics_1.userMetrics.observeDb('team.list', Date.now() - start);
    return { data, total };
}
async function getTeamById(tenantId, teamId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`SELECT ${TEAM_COLS}
           FROM dos.teams
          WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
          LIMIT 1`, [teamId, tenantId]);
            return result.rows[0] || null;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('team.getById', Date.now() - start);
    }
}
async function createTeam(tenantId, data) {
    const teamId = (0, node_crypto_1.randomUUID)();
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`INSERT INTO dos.teams
           (team_id, tenant_id, name, code, description, status, department_id, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, NOW(), NOW())
         RETURNING ${TEAM_COLS}`, [teamId, tenantId, data.name, data.code ?? null, data.description ?? null, data.department_id ?? null, data.createdBy]);
            return result.rows[0];
        });
        metrics_1.userMetrics.teamCreated(tenantId);
        return row;
    }
    catch (err) {
        if (err?.code === '23505') {
            throw new user_errors_1.UserServiceError('TEAM_CODE_DUPLICATE', undefined, { code: data.code });
        }
        throw err;
    }
    finally {
        metrics_1.userMetrics.observeDb('team.create', Date.now() - start);
    }
}
async function updateTeam(tenantId, teamId, data) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`UPDATE dos.teams
         SET name = COALESCE($2, name),
             description = COALESCE($3, description),
             status = COALESCE($4, status),
             department_id = COALESCE($5, department_id),
             updated_at = NOW()
         WHERE team_id = $1 AND tenant_id = $6 AND deleted_at IS NULL
         RETURNING ${TEAM_COLS}`, [teamId, data.name ?? null, data.description ?? null, data.status ?? null, data.department_id ?? null, tenantId]);
            return result.rows[0] || null;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('team.update', Date.now() - start);
    }
}
async function deleteTeam(tenantId, teamId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const result = await c.query(`UPDATE dos.teams
         SET deleted_at = NOW(), updated_at = NOW()
         WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL
         RETURNING team_id`, [teamId, tenantId]);
            return result.rows.length > 0;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('team.delete', Date.now() - start);
    }
}
async function listMembers(tenantId, teamId) {
    const start = Date.now();
    try {
        return await (0, db_1.withTenantClient)(tenantId, async (c) => {
            // Ensure the team itself is in this tenant before joining — defense in
            // depth alongside RLS + FK.
            const teamRes = await c.query(`SELECT 1 FROM dos.teams WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [teamId, tenantId]);
            if (!teamRes.rows.length)
                return [];
            const result = await c.query(`SELECT tm.member_id, tm.team_id, tm.user_id, tm.role, tm.joined_at, tm.left_at,
                u.email, u.display_name, u.first_name, u.last_name
           FROM dos.team_members tm
           LEFT JOIN dos.users u ON u.user_id = tm.user_id
          WHERE tm.team_id = $1 AND tm.left_at IS NULL`, [teamId]);
            return result.rows;
        });
    }
    finally {
        metrics_1.userMetrics.observeDb('team.listMembers', Date.now() - start);
    }
}
async function addMember(tenantId, teamId, userId, role) {
    const start = Date.now();
    try {
        const row = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const teamRes = await c.query(`SELECT 1 FROM dos.teams WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [teamId, tenantId]);
            if (!teamRes.rows.length) {
                throw new user_errors_1.UserServiceError('TEAM_NOT_FOUND', undefined, { teamId });
            }
            const result = await c.query(`INSERT INTO dos.team_members (team_id, user_id, role, joined_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (team_id, user_id) DO UPDATE
           SET role = $3, left_at = NULL, joined_at = NOW()
         RETURNING member_id, team_id, user_id, role, joined_at, left_at`, [teamId, userId, role || 'member']);
            return result.rows[0];
        });
        metrics_1.userMetrics.teamMemberAdded(tenantId);
        return row;
    }
    finally {
        metrics_1.userMetrics.observeDb('team.addMember', Date.now() - start);
    }
}
async function removeMember(tenantId, teamId, userId) {
    const start = Date.now();
    try {
        const ok = await (0, db_1.withTenantClient)(tenantId, async (c) => {
            const teamRes = await c.query(`SELECT 1 FROM dos.teams WHERE team_id = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [teamId, tenantId]);
            if (!teamRes.rows.length)
                return false;
            const result = await c.query(`UPDATE dos.team_members
         SET left_at = NOW()
         WHERE team_id = $1 AND user_id = $2 AND left_at IS NULL
         RETURNING member_id`, [teamId, userId]);
            return result.rows.length > 0;
        });
        if (ok)
            metrics_1.userMetrics.teamMemberRemoved(tenantId);
        return ok;
    }
    finally {
        metrics_1.userMetrics.observeDb('team.removeMember', Date.now() - start);
    }
}
//# sourceMappingURL=team.service.js.map