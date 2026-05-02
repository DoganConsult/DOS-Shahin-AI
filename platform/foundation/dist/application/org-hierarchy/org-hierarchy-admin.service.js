"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyTemplateWithSelectiveActivation = applyTemplateWithSelectiveActivation;
exports.getActivationStatus = getActivationStatus;
exports.updateActivationStatus = updateActivationStatus;
exports.getModuleRoleMappings = getModuleRoleMappings;
exports.getRoleProfiles = getRoleProfiles;
exports.getUserProfileAssignments = getUserProfileAssignments;
exports.assignProfileToUser = assignProfileToUser;
exports.getHierarchyVisualization = getHierarchyVisualization;
exports.getOrgStructureAnalytics = getOrgStructureAnalytics;
exports.defineCustomField = defineCustomField;
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
async function applyTemplateWithSelectiveActivation(tenantId, userId, templateId, orgName, orgNameAr, selection) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const orgId = require('crypto').randomUUID();
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".organizations (org_id, org_name, org_name_ar, status, created_by)
     VALUES ($1, $2, $3, 'active', $4)
     ON CONFLICT DO NOTHING`, [orgId, orgName, orgNameAr || orgName, userId]);
    let created = { organizations: 1, departments: 0, teams: 0 };
    let activated = { departments: 0, teams: 0 };
    try {
        const { rows: templateRows } = await (0, database_port_1.safeQuery)(`SELECT template_data FROM "${schema}".org_templates WHERE template_id = $1 LIMIT 1`, [templateId]);
        if (templateRows[0]?.template_data) {
            const tpl = typeof templateRows[0].template_data === 'string'
                ? JSON.parse(templateRows[0].template_data)
                : templateRows[0].template_data;
            const departments = tpl.departments || [];
            for (const dept of departments) {
                const deptId = require('crypto').randomUUID();
                const selDepts = selection?.departments;
                const isActivated = !selDepts || selDepts.some((s) => s.name === dept.name && s.activated !== false);
                await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".departments (dept_id, org_id, dept_name, dept_name_ar, status, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`, [deptId, orgId, dept.name, dept.nameAr || dept.name, isActivated ? 'active' : 'inactive', userId]);
                created.departments++;
                if (isActivated)
                    activated.departments++;
                for (const team of (dept.teams || [])) {
                    const teamId = require('crypto').randomUUID();
                    const selTeams = selection?.teams;
                    const teamActivated = isActivated && (!selTeams || selTeams.some((s) => s.name === team.name && s.activated !== false));
                    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".teams (team_id, dept_id, team_name, team_name_ar, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6)`, [teamId, deptId, team.name, team.nameAr || team.name, teamActivated ? 'active' : 'inactive', userId]);
                    created.teams++;
                    if (teamActivated)
                        activated.teams++;
                }
            }
        }
    }
    catch (err) {
        logger_port_1.logger.warn('[DOS Foundation] Template lookup failed, creating org only:', String(err));
    }
    const hierarchy = { orgId, orgName, created, activated };
    return { created, activated, hierarchy };
}
async function getActivationStatus(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT d.dept_id, d.dept_name, d.status,
              COUNT(t.team_id)::int AS team_count,
              COUNT(t.team_id) FILTER (WHERE t.status = 'active')::int AS active_team_count
       FROM "${schema}".departments d
       LEFT JOIN "${schema}".teams t ON t.dept_id = d.dept_id AND t.deleted_at IS NULL
       WHERE d.deleted_at IS NULL
       GROUP BY d.dept_id, d.dept_name, d.status
       ORDER BY d.dept_name`);
        const departments = rows.map((r) => ({
            id: r.dept_id,
            name: r.dept_name,
            status: r.status || 'active',
            teamCount: r.team_count,
            activeTeamCount: r.active_team_count,
        }));
        const total = departments.length;
        const active = departments.filter(d => d.status === 'active').length;
        return { departments, summary: { total, active, inactive: total - active } };
    }
    catch (err) {
        logger_port_1.logger.error('[DOS Foundation] getActivationStatus error:', String(err));
        return { departments: [], summary: { total: 0, active: 0, inactive: 0 } };
    }
}
async function updateActivationStatus(tenantId, userId, selection) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let updated = 0;
    for (const dept of selection.departments) {
        try {
            await (0, database_port_1.safeQuery)(`UPDATE "${schema}".departments SET status = $1, updated_by = $2, updated_at = NOW() WHERE dept_id = $3`, [dept.activated ? 'active' : 'inactive', userId, dept.departmentId]);
            updated++;
            if (dept.teams) {
                for (const team of dept.teams) {
                    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".teams SET status = $1, updated_by = $2, updated_at = NOW() WHERE team_id = $3`, [team.activated ? 'active' : 'inactive', userId, team.teamId]);
                    updated++;
                }
            }
        }
        catch (err) {
            logger_port_1.logger.error('[DOS Foundation] updateActivationStatus error:', String(err));
        }
    }
    return { updated, moduleMappings: [] };
}
async function getModuleRoleMappings(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT rtm.role_code, rtm.team_id, t.team_name, rtm.module_code
       FROM "${schema}".role_team_mapping rtm
       JOIN "${schema}".teams t ON t.team_id = rtm.team_id AND t.deleted_at IS NULL
       WHERE t.status = 'active'
       ORDER BY rtm.module_code, t.team_name`);
        return rows;
    }
    catch (err) {
        logger_port_1.logger.warn('[DOS Foundation] getModuleRoleMappings error (table may not exist):', String(err));
        return [];
    }
}
async function getRoleProfiles(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT rp.profile_code, rp.profile_name, rp.profile_name_ar, rp.description,
              rp.access_level, rp.is_active, rp.sort_order
       FROM "${schema}".role_profiles rp
       WHERE rp.is_active = TRUE
       ORDER BY rp.sort_order, rp.profile_name`);
        return rows;
    }
    catch (err) {
        logger_port_1.logger.warn('[DOS Foundation] getRoleProfiles error (table may not exist):', String(err));
        return [];
    }
}
async function getUserProfileAssignments(tenantId, userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows } = await (0, database_port_1.safeQuery)(`SELECT ura.role_code, ura.module_code, ura.scope_type, ura.scope_id,
              ura.is_active, ura.valid_from, ura.valid_to
       FROM "${schema}".enterprise_user_role_assignments ura
       WHERE ura.user_id = $1 AND ura.is_active = TRUE
       ORDER BY ura.module_code, ura.role_code`, [userId]);
        return rows;
    }
    catch (err) {
        logger_port_1.logger.error('[DOS Foundation] getUserProfileAssignments error:', String(err));
        return [];
    }
}
async function assignProfileToUser(tenantId, userId, targetUserId, teamId, departmentId, profileCode) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".enterprise_user_role_assignments
       (user_id, role_code, scope_type, scope_id, is_active, created_by, valid_from)
     VALUES ($1, $2, 'team', $3, TRUE, $4, NOW())
     ON CONFLICT DO NOTHING`, [targetUserId, profileCode, teamId, userId]);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".team_members (team_id, user_id, role_in_team, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     ON CONFLICT (team_id, user_id) DO UPDATE SET role_in_team = $3, is_active = TRUE, updated_at = NOW()`, [teamId, targetUserId, profileCode, userId]);
    return { assigned: true, roleCode: profileCode };
}
async function getHierarchyVisualization(tenantId, layoutType) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        const { rows: nodeRows } = await (0, database_port_1.safeQuery)(`SELECT node_id, node_type, name_en, name_ar, parent_node_id, status, metadata
       FROM "${schema}".org_hierarchy_nodes
       WHERE status = 'active'
       ORDER BY sort_order, name_en`);
        const { rows: edgeRows } = await (0, database_port_1.safeQuery)(`SELECT source_node_id, target_node_id, edge_type, weight
       FROM "${schema}".org_hierarchy_edges
       WHERE is_active = TRUE`);
        return { nodes: nodeRows, edges: edgeRows, layoutType };
    }
    catch (err) {
        logger_port_1.logger.warn('[DOS Foundation] org_hierarchy_nodes/edges not available, building from tables:', String(err));
        const nodes = [];
        const edges = [];
        const tables = [
            { table: 'organizations', pk: 'org_id', name: 'org_name', type: 'organization', parentCol: null },
            { table: 'business_units', pk: 'bu_id', name: 'bu_name', type: 'division', parentCol: 'org_id' },
            { table: 'departments', pk: 'dept_id', name: 'dept_name', type: 'department', parentCol: 'bu_id' },
            { table: 'teams', pk: 'team_id', name: 'team_name', type: 'team', parentCol: 'dept_id' },
        ];
        for (const t of tables) {
            try {
                // secrets-scan-allow: table/column names from a hardcoded TypeScript array, schema is tenantSchema()-validated
                const { rows } = await (0, database_port_1.safeQuery)(`SELECT ${t.pk} AS id, ${t.name} AS name, status${t.parentCol ? `, ${t.parentCol} AS parent_id` : ''}
           FROM "${schema}".${t.table}
           WHERE deleted_at IS NULL AND (status IS NULL OR status = 'active')`);
                for (const r of rows) {
                    nodes.push({ id: r.id, name: r.name, type: t.type, status: r.status || 'active' });
                    if (t.parentCol && r.parent_id) {
                        edges.push({ source_node_id: r.parent_id, target_node_id: r.id, edge_type: 'parent_child' });
                    }
                }
            }
            catch { }
        }
        return { nodes, edges, layoutType };
    }
}
async function getOrgStructureAnalytics(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const nodeCount = { organization: 0, division: 0, department: 0, team: 0 };
    let memberCount = 0;
    let avgTeamSize = 0;
    let activationRate = 1;
    try {
        for (const [type, table] of [['organization', 'organizations'], ['division', 'business_units'], ['department', 'departments'], ['team', 'teams']]) {
            // secrets-scan-allow: table/column names from a hardcoded TypeScript array, schema is tenantSchema()-validated
            const { rows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS c FROM "${schema}".${table} WHERE deleted_at IS NULL`);
            nodeCount[type] = rows[0]?.c || 0;
        }
        const { rows: memRows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS c FROM "${schema}".team_members WHERE is_active = TRUE`);
        memberCount = memRows[0]?.c || 0;
        if (nodeCount.team > 0)
            avgTeamSize = Math.round((memberCount / nodeCount.team) * 10) / 10;
        const totalNodes = Object.values(nodeCount).reduce((a, b) => a + b, 0);
        if (totalNodes > 0) {
            let activeNodes = 0;
            for (const table of ['organizations', 'business_units', 'departments', 'teams']) {
                // secrets-scan-allow: table/column names from a hardcoded TypeScript array, schema is tenantSchema()-validated
                const { rows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS c FROM "${schema}".${table} WHERE deleted_at IS NULL AND status = 'active'`);
                activeNodes += rows[0]?.c || 0;
            }
            activationRate = Math.round((activeNodes / totalNodes) * 100) / 100;
        }
    }
    catch (err) {
        logger_port_1.logger.error('[DOS Foundation] getOrgStructureAnalytics error:', String(err));
    }
    return {
        nodeCount,
        memberCount,
        avgTeamSize,
        depthDistribution: { organizations: nodeCount.organization, divisions: nodeCount.division, departments: nodeCount.department, teams: nodeCount.team },
        activationRate,
    };
}
async function defineCustomField(tenantId, userId, field) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const fieldId = field.fieldId || require('crypto').randomUUID();
    try {
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".org_custom_fields
         (field_id, field_key, field_name, field_type, node_types, is_required, default_value, options, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (field_key) DO UPDATE SET
         field_name = EXCLUDED.field_name,
         field_type = EXCLUDED.field_type,
         node_types = EXCLUDED.node_types,
         updated_at = NOW()`, [
            fieldId, field.fieldKey, field.fieldName, field.fieldType,
            JSON.stringify(field.nodeTypes), field.isRequired || false,
            field.defaultValue !== undefined ? JSON.stringify(field.defaultValue) : null,
            field.options ? JSON.stringify(field.options) : null,
            userId,
        ]);
        return { fieldId, created: true };
    }
    catch (err) {
        logger_port_1.logger.warn('[DOS Foundation] defineCustomField error (table may not exist):', String(err));
        return { fieldId, created: false };
    }
}
//# sourceMappingURL=org-hierarchy-admin.service.js.map