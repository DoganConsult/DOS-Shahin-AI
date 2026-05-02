"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionRepository = void 0;
const uuid_1 = require("uuid");
const database_port_1 = require("../ports/database.port");
const db_1 = require("@dos/db");
const platform_port_1 = require("../ports/platform.port");
class ActionRepository {
    constructor(tenantId) { this.schema = (0, database_port_1.tenantSchema)(tenantId); }
    async findById(id) {
        const result = await (0, database_port_1.safeQuery)(`SELECT * FROM "${this.schema}".action_items WHERE action_id = $1 AND deleted_at IS NULL`, [id]);
        return (0, db_1.getFirstRow)(result);
    }
    async findAll(filters = {}) {
        const conditions = ['deleted_at IS NULL'];
        const params = [];
        let idx = 1;
        if (filters.status) {
            conditions.push(`status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.search) {
            conditions.push(`(title ILIKE $${idx} OR description ILIKE $${idx})`);
            params.push(`%${filters.search}%`);
            idx++;
        }
        const where = 'WHERE ' + conditions.join(' AND ');
        const page = Math.max(1, filters.page || 1);
        const pageSize = Math.min(100, Math.max(1, filters.pageSize || 25));
        const offset = (page - 1) * pageSize;
        const sortCol = filters.sortBy || 'created_at';
        const sortDir = filters.sortDir === 'ASC' ? 'ASC' : 'DESC';
        const countResult = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${this.schema}".action_items ${where}`, params);
        const total = (0, db_1.getFirstRow)(countResult)?.total ?? 0;
        const dataResult = await (0, database_port_1.safeQuery)(`SELECT * FROM "${this.schema}".action_items ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`, [...params, pageSize, offset]);
        return { rows: dataResult.rows, total };
    }
    async create(data) {
        const id = (0, uuid_1.v4)().slice(0, 8);
        const cols = ['action_id'];
        const vals = [id];
        const keys = Object.keys(data);
        for (const k of keys) {
            if (k !== 'action_id') {
                cols.push(k);
                vals.push(data[k]);
            }
        }
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
        const result = await (0, database_port_1.safeQuery)(`INSERT INTO "${this.schema}".action_items (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`, vals);
        return (0, db_1.getFirstRow)(result);
    }
    async update(id, data) {
        const sets = [];
        const params = [];
        let idx = 1;
        for (const [k, v] of Object.entries(data)) {
            sets.push(`${k} = $${idx++}`);
            params.push(v);
        }
        sets.push(`updated_at = NOW()`);
        params.push(id);
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${this.schema}".action_items SET ${sets.join(', ')} WHERE action_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
        return (0, db_1.getFirstRow)(result);
    }
    async softDelete(id, deletedBy) {
        const result = await (0, database_port_1.safeQuery)(`UPDATE "${this.schema}".action_items SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW() WHERE action_id = $1 AND deleted_at IS NULL RETURNING action_id`, [id, deletedBy || platform_port_1.SYSTEM_JOB_ACTOR]);
        return (result.rows?.length ?? 0) > 0;
    }
    async count(filters = {}) {
        const conditions = ['deleted_at IS NULL'];
        const params = [];
        let idx = 1;
        if (filters.status) {
            conditions.push(`status = $${idx++}`);
            params.push(filters.status);
        }
        const result = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total FROM "${this.schema}".action_items WHERE ${conditions.join(' AND ')}`, params);
        return (0, db_1.getFirstRow)(result)?.total ?? 0;
    }
}
exports.ActionRepository = ActionRepository;
//# sourceMappingURL=action.repository.js.map