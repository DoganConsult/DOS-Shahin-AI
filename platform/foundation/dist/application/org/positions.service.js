"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPositions = listPositions;
exports.getPositionById = getPositionById;
exports.createPosition = createPosition;
exports.updatePosition = updatePosition;
exports.deletePosition = deletePosition;
const database_port_1 = require("../../ports/database.port");
const events_port_1 = require("../../ports/events.port");
const database_port_2 = require("../../ports/database.port");
const resilience_port_1 = require("../../ports/resilience.port");
async function listPositions(tenantId, filters = {}) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const params = [];
    let sql = `SELECT * FROM "${schema}".positions WHERE deleted_at IS NULL`;
    if (filters.departmentId) {
        params.push(filters.departmentId);
        sql += ` AND dept_id = $${params.length}`;
    }
    sql += ` ORDER BY title_en ASC`;
    if (filters.limit) {
        params.push(filters.limit);
        sql += ` LIMIT $${params.length}`;
    }
    if (filters.offset) {
        params.push(filters.offset);
        sql += ` OFFSET $${params.length}`;
    }
    const result = await (0, database_port_1.safeQuery)(sql, params);
    return result.rows;
}
async function getPositionById(tenantId, positionId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".positions WHERE position_id = $1 AND deleted_at IS NULL`, [positionId]);
    return (0, database_port_2.getFirstRow)(result);
}
async function createPosition(tenantId, data, actorId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".positions
       (dept_id, title_en, title_ar, grade, reports_to_position_id, status, metadata, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`, [
        data.dept_id || null,
        data.title_en,
        data.title_ar || null,
        data.grade || null,
        data.reports_to_position_id || null,
        data.status || 'active',
        data.metadata ? JSON.stringify(data.metadata) : null,
        actorId,
    ]);
    const newPosition = (0, database_port_2.getFirstRow)(result);
    if (newPosition) {
        (0, events_port_1.emitEvent)({
            event_type: 'foundation.position.created',
            tenantId,
            userId: actorId,
            module: 'foundation',
            event: 'position.created',
            entityType: 'position',
            entityId: newPosition.position_id,
            data: newPosition,
        }).catch((0, resilience_port_1.catchHandler)(resilience_port_1.EC.EVENT_BUS, { operation: 'emit foundation.position.created' }));
    }
    return newPosition;
}
async function updatePosition(tenantId, positionId, data, actorId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const sets = [];
    const params = [];
    let idx = 1;
    for (const [key, value] of Object.entries(data)) {
        if (value !== undefined) {
            const dbKey = key === 'departmentId' ? 'dept_id' : key;
            sets.push(`${dbKey} = $${idx++}`);
            params.push(key === 'metadata' ? JSON.stringify(value) : value);
        }
    }
    if (sets.length === 0) {
        return getPositionById(tenantId, positionId);
    }
    sets.push(`updated_at = NOW()`, `updated_by = $${idx++}`);
    params.push(actorId, positionId);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".positions SET ${sets.join(', ')} WHERE position_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
    const updatedPosition = (0, database_port_2.getFirstRow)(result);
    if (updatedPosition) {
        (0, events_port_1.emitEvent)({
            event_type: 'foundation.position.updated',
            tenantId,
            userId: actorId,
            module: 'foundation',
            event: 'position.updated',
            entityType: 'position',
            entityId: positionId,
            data: { changes: data },
        }).catch((0, resilience_port_1.catchHandler)(resilience_port_1.EC.EVENT_BUS, { operation: 'emit foundation.position.updated' }));
    }
    return updatedPosition;
}
async function deletePosition(tenantId, positionId, actorId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const result = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".positions SET deleted_at = NOW(), updated_by = $2 WHERE position_id = $1 AND deleted_at IS NULL`, [positionId, actorId]);
    const deleted = (result.rowCount ?? 0) > 0;
    if (deleted) {
        (0, events_port_1.emitEvent)({
            event_type: 'foundation.position.deleted',
            tenantId,
            userId: actorId,
            module: 'foundation',
            event: 'position.deleted',
            entityType: 'position',
            entityId: positionId,
        }).catch((0, resilience_port_1.catchHandler)(resilience_port_1.EC.EVENT_BUS, { operation: 'emit foundation.position.deleted' }));
    }
    return { deleted };
}
//# sourceMappingURL=positions.service.js.map