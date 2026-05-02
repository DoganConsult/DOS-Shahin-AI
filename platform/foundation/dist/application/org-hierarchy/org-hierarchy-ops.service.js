"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkCreateNodes = bulkCreateNodes;
exports.bulkUpdateStatus = bulkUpdateStatus;
exports.bulkDeleteNodes = bulkDeleteNodes;
exports.bulkMoveNodes = bulkMoveNodes;
exports.searchOrgStructure = searchOrgStructure;
exports.exportOrgStructure = exportOrgStructure;
exports.importOrgStructure = importOrgStructure;
exports.assignLocation = assignLocation;
exports.assignCostCenter = assignCostCenter;
exports.assignMember = assignMember;
exports.bulkAssignMembers = bulkAssignMembers;
const database_port_1 = require("../../ports/database.port");
const logger_port_1 = require("../../ports/logger.port");
const TABLE_MAP = {
    organization: 'organizations', division: 'business_units',
    department: 'departments', team: 'teams', unit: 'teams',
};
const PK_MAP = {
    organization: 'org_id', division: 'bu_id',
    department: 'dept_id', team: 'team_id', unit: 'team_id',
};
const NAME_COL = {
    organization: 'org_name', division: 'bu_name',
    department: 'dept_name', team: 'team_name', unit: 'team_name',
};
const PARENT_COL = {
    organization: null, division: 'org_id',
    department: 'bu_id', team: 'dept_id', unit: 'dept_id',
};
async function bulkCreateNodes(tenantId, userId, nodes) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const ids = [];
    const errors = [];
    for (const node of nodes) {
        try {
            const table = TABLE_MAP[node.type];
            const pk = PK_MAP[node.type];
            const nameCol = NAME_COL[node.type];
            const parentCol = PARENT_COL[node.type];
            if (!table) {
                errors.push(`Unknown node type: ${node.type}`);
                continue;
            }
            const id = require('crypto').randomUUID();
            const cols = [pk, nameCol, 'status', 'created_by'];
            const vals = [id, node.name || '', 'active', userId];
            if (parentCol && node.parentId) {
                cols.push(parentCol);
                vals.push(node.parentId);
            }
            if (node.nameAr) {
                cols.push(nameCol.replace('_name', '_name_ar'));
                vals.push(node.nameAr);
            }
            const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
            await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".${table} (${cols.join(', ')}) VALUES (${placeholders})`, vals);
            ids.push(id);
        }
        catch (err) {
            errors.push(`Failed to create ${node.name}: ${String(err)}`);
        }
    }
    return { created: ids.length, ids, errors };
}
async function bulkUpdateStatus(tenantId, userId, nodeIds, nodeType, status) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const table = TABLE_MAP[nodeType];
    const pk = PK_MAP[nodeType];
    if (!table)
        throw new Error(`Unknown node type: ${nodeType}`);
    const placeholders = nodeIds.map((_, i) => `$${i + 3}`).join(', ');
    const res = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".${table}
     SET status = $1, updated_by = $2, updated_at = NOW()
     WHERE ${pk} IN (${placeholders}) AND deleted_at IS NULL`, [status, userId, ...nodeIds]);
    return { updated: res.rowCount || 0 };
}
async function bulkDeleteNodes(tenantId, userId, nodeIds, nodeType) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const table = TABLE_MAP[nodeType];
    const pk = PK_MAP[nodeType];
    if (!table)
        throw new Error(`Unknown node type: ${nodeType}`);
    const placeholders = nodeIds.map((_, i) => `$${i + 2}`).join(', ');
    const res = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".${table}
     SET deleted_at = NOW(), updated_by = $1
     WHERE ${pk} IN (${placeholders}) AND deleted_at IS NULL`, [userId, ...nodeIds]);
    return { deleted: res.rowCount || 0 };
}
async function bulkMoveNodes(tenantId, userId, moves) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let moved = 0;
    const errors = [];
    for (const move of moves) {
        try {
            const table = TABLE_MAP[move.nodeType];
            const pk = PK_MAP[move.nodeType];
            const parentCol = PARENT_COL[move.nodeType];
            if (!table || !parentCol) {
                errors.push(`Cannot move ${move.nodeType} nodes`);
                continue;
            }
            await (0, database_port_1.safeQuery)(`UPDATE "${schema}".${table}
         SET ${parentCol} = $1, updated_by = $2, updated_at = NOW()
         WHERE ${pk} = $3 AND deleted_at IS NULL`, [move.newParentId, userId, move.nodeId]);
            moved++;
        }
        catch (err) {
            errors.push(`Failed to move ${move.nodeId}: ${String(err)}`);
        }
    }
    return { moved, errors };
}
async function searchOrgStructure(tenantId, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const nodeType = (filters.nodeType || 'organization');
    const table = TABLE_MAP[nodeType] || 'organizations';
    const _pk = PK_MAP[nodeType] || 'org_id';
    const nameCol = NAME_COL[nodeType] || 'org_name';
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    let idx = 1;
    if (filters.status) {
        conditions.push(`status = $${idx}`);
        params.push(filters.status);
        idx++;
    }
    if (filters.searchTerm) {
        conditions.push(`${nameCol} ILIKE $${idx}`);
        params.push(`%${filters.searchTerm}%`);
        idx++;
    }
    if (filters.headUserId) {
        conditions.push(`head_user_id = $${idx}`);
        params.push(filters.headUserId);
        idx++;
    }
    const parentCol = PARENT_COL[nodeType];
    if (filters.parentId && parentCol) {
        conditions.push(`${parentCol} = $${idx}`);
        params.push(filters.parentId);
        idx++;
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(filters.limit || 100, 500);
    const offset = filters.offset || 0;
    try {
        const countRes = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".${table} ${where}`, params);
        const total = countRes.rows[0]?.total || 0;
        const dataRes = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".${table} ${where} ORDER BY ${nameCol} LIMIT ${limit} OFFSET ${offset}`, params);
        return { data: dataRes.rows, total, limit, offset };
    }
    catch (err) {
        logger_port_1.logger.error('[DOS Foundation] searchOrgStructure error:', String(err));
        return { data: [], total: 0, limit, offset };
    }
}
async function exportOrgStructure(tenantId, options) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const statusFilter = options.includeInactive ? '' : "AND (status IS NULL OR status = 'active')";
    const types = options.nodeTypes || ['organization', 'division', 'department', 'team'];
    const allNodes = [];
    for (const t of types) {
        const table = TABLE_MAP[t];
        const pk = PK_MAP[t];
        const nameCol = NAME_COL[t];
        if (!table)
            continue;
        try {
            const { rows } = await (0, database_port_1.safeQuery)(`SELECT ${pk} AS id, ${nameCol} AS name, status, head_user_id, created_at
         FROM "${schema}".${table}
         WHERE deleted_at IS NULL ${statusFilter}
         ORDER BY ${nameCol}`);
            for (const r of rows)
                allNodes.push({ ...r, type: t });
        }
        catch { }
    }
    if (options.format === 'csv') {
        const header = 'type,id,name,status,head_user_id,created_at';
        const lines = allNodes.map((_n) => { const n = _n; return `${n.type},${n.id},${(String(n.name || '')).replace(/,/g, ';')},${n.status || ''},${n.head_user_id || ''},${n.created_at || ''}`; });
        return {
            data: [header, ...lines].join('\n'),
            mimeType: 'text/csv',
            filename: `org-structure-${tenantId}.csv`,
        };
    }
    return {
        data: { nodes: allNodes, exportedAt: new Date().toISOString(), tenantId },
        mimeType: 'application/json',
        filename: `org-structure-${tenantId}.json`,
    };
}
async function importOrgStructure(tenantId, userId, importData, format, _options) {
    let nodes = [];
    if (format === 'json') {
        nodes = typeof importData === 'string' ? JSON.parse(importData) : (importData.nodes || importData);
        if (!Array.isArray(nodes))
            nodes = [nodes];
    }
    else if (format === 'csv') {
        const lines = (typeof importData === 'string' ? importData : '').split('\n').filter(Boolean);
        const header = lines[0]?.split(',') || [];
        for (let i = 1; i < lines.length; i++) {
            const vals = lines[i].split(',');
            const row = {};
            header.forEach((h, j) => { row[h.trim()] = vals[j]?.trim() || ''; });
            nodes.push(row);
        }
    }
    const result = await bulkCreateNodes(tenantId, userId, nodes.map((_n) => {
        const n = _n;
        return {
            type: (n.type || 'organization'),
            name: String(n.name || n.org_name || n.bu_name || n.dept_name || n.team_name || ''),
            nameAr: (n.nameAr || n.name_ar || undefined),
            parentId: (n.parentId || n.parent_id || undefined),
        };
    }));
    return { imported: result.created, errors: result.errors };
}
async function assignLocation(tenantId, userId, assignment) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const table = TABLE_MAP[assignment.nodeType];
    const pk = PK_MAP[assignment.nodeType];
    if (!table)
        throw new Error(`Unknown node type: ${assignment.nodeType}`);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".${table}
     SET location_id = $1, updated_by = $2, updated_at = NOW()
     WHERE ${pk} = $3`, [assignment.locationId, userId, assignment.nodeId]);
    return { assigned: true };
}
async function assignCostCenter(tenantId, userId, assignment) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const table = TABLE_MAP[assignment.nodeType];
    const pk = PK_MAP[assignment.nodeType];
    if (!table)
        throw new Error(`Unknown node type: ${assignment.nodeType}`);
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".${table}
     SET cost_center_id = $1, updated_by = $2, updated_at = NOW()
     WHERE ${pk} = $3`, [assignment.costCenterId, userId, assignment.nodeId]);
    return { assigned: true };
}
async function assignMember(tenantId, userId, assignment) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".team_members (team_id, user_id, role_in_team, is_active, created_by)
     VALUES ($1, $2, $3, TRUE, $4)
     ON CONFLICT (team_id, user_id) DO UPDATE SET is_active = TRUE, updated_at = NOW()`, [assignment.nodeId, assignment.userId, assignment.role || 'member', userId]);
    return { assigned: true };
}
async function bulkAssignMembers(tenantId, userId, assignments) {
    let assigned = 0;
    const errors = [];
    for (const a of assignments) {
        try {
            await assignMember(tenantId, userId, a);
            assigned++;
        }
        catch (err) {
            errors.push(`Failed to assign ${a.userId} to ${a.nodeId}: ${String(err)}`);
        }
    }
    return { assigned, errors };
}
//# sourceMappingURL=org-hierarchy-ops.service.js.map