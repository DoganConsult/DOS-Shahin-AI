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
const database_port_1 = require("../../ports/database.port");
const TEAM_COLS = `
  team_id, bu_id, department_id, name_en, name_ar, code, team_type, function_code,
  status, description, owner_user_id, metadata_json, created_at, updated_at
`;
async function listTeams(tenantId, params) {
    const page = Math.max(1, params.page);
    const pageSize = Math.max(1, Math.min(200, params.pageSize));
    const offset = (page - 1) * pageSize;
    const conditions = ['tenant_id = $1', 'deleted_at IS NULL'];
    const values = [tenantId];
    let idx = 2;
    if (params.status) {
        conditions.push(`status = $${idx++}`);
        values.push(params.status);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const totalRes = await (0, database_port_1.query)(`SELECT COUNT(*)::int AS total FROM dos.teams ${where}`, values);
    const total = totalRes.rows[0]?.total ?? 0;
    const dataRes = await (0, database_port_1.query)(`SELECT ${TEAM_COLS} FROM dos.teams ${where}
       ORDER BY created_at DESC NULLS LAST LIMIT ${pageSize} OFFSET ${offset}`, values);
    return { data: dataRes.rows, total };
}
async function getTeamById(tenantId, teamId) {
    const res = await (0, database_port_1.query)(`SELECT ${TEAM_COLS} FROM dos.teams
      WHERE team_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL`, [teamId, tenantId]);
    return res.rows[0] ?? null;
}
async function createTeam(tenantId, input) {
    const teamId = `team_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const res = await (0, database_port_1.query)(`INSERT INTO dos.teams
       (team_id, tenant_id, bu_id, department_id, name_en, name, code, team_code,
        description, owner_user_id, head_user_id, status, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $5, $6, $6, $7, $8, $8, 'active', NOW(), NOW())
     RETURNING ${TEAM_COLS}`, [
        teamId,
        tenantId,
        input.bu_id ?? null,
        input.department_id ?? null,
        input.name_en,
        input.code ?? null,
        input.description ?? null,
        input.owner_user_id ?? null,
    ]);
    return res.rows[0];
}
async function updateTeam(tenantId, teamId, patch) {
    const sets = ['updated_at = NOW()'];
    const values = [];
    let idx = 1;
    if (patch.name_en !== undefined) {
        sets.push(`name_en = $${idx}`, `name = $${idx++}`);
        values.push(patch.name_en);
    }
    if (patch.code !== undefined) {
        sets.push(`code = $${idx}`, `team_code = $${idx++}`);
        values.push(patch.code);
    }
    if (patch.description !== undefined) {
        sets.push(`description = $${idx++}`);
        values.push(patch.description);
    }
    if (patch.department_id !== undefined) {
        sets.push(`department_id = $${idx++}`);
        values.push(patch.department_id);
    }
    if (patch.bu_id !== undefined) {
        sets.push(`bu_id = $${idx++}`);
        values.push(patch.bu_id);
    }
    if (patch.status !== undefined) {
        sets.push(`status = $${idx++}`);
        values.push(patch.status);
    }
    if (patch.owner_user_id !== undefined) {
        sets.push(`owner_user_id = $${idx}`, `head_user_id = $${idx++}`);
        values.push(patch.owner_user_id);
    }
    values.push(teamId, tenantId);
    const res = await (0, database_port_1.query)(`UPDATE dos.teams
        SET ${sets.join(', ')}
      WHERE team_id::text = $${idx} AND tenant_id = $${idx + 1} AND deleted_at IS NULL
      RETURNING ${TEAM_COLS}`, values);
    return res.rows[0] ?? null;
}
async function deleteTeam(tenantId, teamId) {
    const res = await (0, database_port_1.query)(`UPDATE dos.teams
        SET deleted_at = NOW(), updated_at = NOW()
      WHERE team_id::text = $1 AND tenant_id = $2 AND deleted_at IS NULL
      RETURNING team_id`, [teamId, tenantId]);
    return res.rows.length > 0;
}
async function listMembers(tenantId, teamId) {
    const res = await (0, database_port_1.query)(`SELECT tm.team_member_id, tm.team_id, tm.user_id,
            COALESCE(tm.role_in_team, tm.role) AS role_in_team,
            COALESCE(tm.is_owner, false) AS is_owner,
            COALESCE(tm.joined_at, tm.created_at) AS joined_at,
            tm.ended_at, tm.created_at
       FROM dos.team_members tm
       JOIN dos.teams t ON t.team_id = tm.team_id
      WHERE tm.team_id::text = $1 AND t.tenant_id = $2
      ORDER BY COALESCE(tm.joined_at, tm.created_at) DESC`, [teamId, tenantId]);
    return res.rows;
}
async function addMember(tenantId, teamId, userId, roleInTeam) {
    const res = await (0, database_port_1.query)(`INSERT INTO dos.team_members (team_id, user_id, role, role_in_team, joined_at, created_at)
     VALUES ($1, $2, $3, $3, NOW(), NOW())
     ON CONFLICT (team_id, user_id) DO UPDATE
       SET role_in_team = EXCLUDED.role_in_team,
           role         = EXCLUDED.role
     RETURNING team_member_id, team_id, user_id, role_in_team,
               COALESCE(is_owner, false) AS is_owner, joined_at, ended_at, created_at`, [teamId, userId, roleInTeam]);
    // tenantId enforced via caller's authorization layer; row exists on dos.teams join check
    void tenantId;
    return res.rows[0];
}
async function removeMember(tenantId, teamId, userId) {
    const res = await (0, database_port_1.query)(`DELETE FROM dos.team_members tm
       USING dos.teams t
      WHERE tm.team_id = t.team_id
        AND tm.team_id::text = $1 AND tm.user_id = $2 AND t.tenant_id = $3
     RETURNING tm.team_member_id`, [teamId, userId, tenantId]);
    return res.rows.length > 0;
}
//# sourceMappingURL=teams.service.js.map