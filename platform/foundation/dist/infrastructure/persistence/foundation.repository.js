"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllNodes = getAllNodes;
exports.getNodesPaginated = getNodesPaginated;
exports.getNodeById = getNodeById;
exports.createNode = createNode;
exports.updateNode = updateNode;
exports.deleteNode = deleteNode;
exports.getChildren = getChildren;
exports.writeAuditLog = writeAuditLog;
exports.getHierarchyStats = getHierarchyStats;
const database_port_1 = require("../../ports/database.port");
const platform_port_1 = require("../../ports/platform.port");
async function getAllNodes(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".organizations WHERE deleted_at IS NULL ORDER BY level ASC, name_en ASC`);
    return result.rows;
}
async function getNodesPaginated(tenantId, filters, page = 1, pageSize = 25) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const conditions = ['deleted_at IS NULL'];
    const params = [];
    if (filters?.entityType) {
        params.push(filters.entityType);
        conditions.push(`entity_type = $${params.length}`);
    }
    if (filters?.parentId) {
        params.push(filters.parentId);
        conditions.push(`parent_id = $${params.length}`);
    }
    if (filters?.status) {
        params.push(filters.status);
        conditions.push(`status = $${params.length}`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${schema}".organizations ${where}`, params);
    const total = countResult.rows[0]?.total ?? 0;
    const offset = (page - 1) * pageSize;
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".organizations ${where} ORDER BY level ASC, name_en ASC LIMIT ${pageSize} OFFSET ${offset}`, params);
    return { rows: result.rows, total };
}
async function getNodeById(tenantId, nodeId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".organizations WHERE id = $1 AND deleted_at IS NULL`, [nodeId]);
    return result.rows[0] || null;
}
async function createNode(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".organizations (entity_type, parent_id, name_en, name_ar, code, status, level, path, owner_id, metadata, created_by, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`, [data.entityType, data.parentId || null, data.nameEn, data.nameAr || null, data.code,
        data.level || 0, data.path || '/', data.ownerId || null, JSON.stringify(data.metadata || {}), data.createdBy || platform_port_1.SYSTEM_JOB_ACTOR]);
    return result.rows[0];
}
async function updateNode(tenantId, nodeId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const fields = [];
    const params = [];
    let idx = 1;
    const allowed = ['name_en', 'name_ar', 'code', 'parent_id', 'owner_id', 'status', 'metadata'];
    for (const [key, value] of Object.entries(data)) {
        if (allowed.includes(key)) {
            fields.push(`${key} = $${idx++}`);
            params.push(key === 'metadata' ? JSON.stringify(value) : value);
        }
    }
    if (fields.length === 0)
        return getNodeById(tenantId, nodeId);
    fields.push(`updated_at = NOW()`);
    params.push(nodeId);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".organizations SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    return result.rows[0] || null;
}
async function deleteNode(tenantId, nodeId, _userId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".organizations SET deleted_at = NOW(), updated_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING id`, [nodeId]);
    return (result.rows?.length ?? 0) > 0;
}
async function getChildren(tenantId, parentId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".organizations WHERE parent_id = $1 AND deleted_at IS NULL ORDER BY name_en ASC`, [parentId]);
    return result.rows;
}
async function writeAuditLog(tenantId, entityId, action, actorId, beforeState, afterState) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    try {
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".foundation_audit_log (entity_id, action, actor_id, before_state, after_state, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`, [entityId, action, actorId, JSON.stringify(beforeState), JSON.stringify(afterState)]);
    }
    catch {
        // Audit table may not exist — non-blocking
    }
}
async function getHierarchyStats(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const stats = await (0, database_port_1.safeQuery)(`
    SELECT
      COUNT(*)::int AS total_nodes,
      COALESCE(MAX(level), 0)::int AS max_depth,
      COUNT(*) FILTER (WHERE parent_id IS NOT NULL AND parent_id NOT IN (SELECT id FROM "${schema}".organizations WHERE deleted_at IS NULL))::int AS orphaned_nodes
    FROM "${schema}".organizations WHERE deleted_at IS NULL
  `);
    const dupes = await (0, database_port_1.safeQuery)(`
    SELECT COUNT(*)::int AS dupe_count FROM (
      SELECT code FROM "${schema}".organizations WHERE deleted_at IS NULL GROUP BY code HAVING COUNT(*) > 1
    ) d
  `);
    const row = stats.rows[0] || {};
    return {
        totalNodes: row.total_nodes || 0,
        maxDepth: row.max_depth || 0,
        orphanedNodes: row.orphaned_nodes || 0,
        duplicateCodes: dupes.rows[0]?.dupe_count || 0,
    };
}
//# sourceMappingURL=foundation.repository.js.map