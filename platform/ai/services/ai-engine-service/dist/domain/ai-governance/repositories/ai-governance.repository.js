import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../ports/database.port.js';
import { getFirstRow } from "@dos/db";
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port.js';
export class AiGovernanceRepository {
    schema;
    constructor(tenantId) { this.schema = tenantSchema(tenantId); }
    async findById(id) {
        const result = await safeQuery(`SELECT * FROM "${this.schema}".ai_governance_systems WHERE system_id = $1 AND deleted_at IS NULL`, [id]);
        return getFirstRow(result);
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
        const countResult = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".ai_governance_systems ${where}`, params);
        const total = getFirstRow(countResult)?.total ?? 0;
        const dataResult = await safeQuery(`SELECT * FROM "${this.schema}".ai_governance_systems ${where} ORDER BY ${sortCol} ${sortDir} LIMIT $${idx++} OFFSET $${idx++}`, [...params, pageSize, offset]);
        return { rows: dataResult.rows, total };
    }
    async create(data) {
        const id = uuid().slice(0, 8);
        const cols = ['system_id'];
        const vals = [id];
        const keys = Object.keys(data);
        for (const k of keys) {
            if (k !== 'system_id') {
                cols.push(k);
                vals.push(data[k]);
            }
        }
        const placeholders = vals.map((_, i) => `$${i + 1}`).join(',');
        const result = await safeQuery(`INSERT INTO "${this.schema}".ai_governance_systems (${cols.join(',')}) VALUES (${placeholders}) RETURNING *`, vals);
        return getFirstRow(result);
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
        const result = await safeQuery(`UPDATE "${this.schema}".ai_governance_systems SET ${sets.join(', ')} WHERE system_id = $${idx} AND deleted_at IS NULL RETURNING *`, params);
        return getFirstRow(result);
    }
    async softDelete(id, deletedBy) {
        const result = await safeQuery(`UPDATE "${this.schema}".ai_governance_systems SET deleted_at = NOW(), deleted_by = $2, updated_at = NOW() WHERE system_id = $1 AND deleted_at IS NULL RETURNING system_id`, [id, deletedBy || SYSTEM_JOB_ACTOR]);
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
        const result = await safeQuery(`SELECT COUNT(*)::int AS total FROM "${this.schema}".ai_governance_systems WHERE ${conditions.join(' AND ')}`, params);
        return getFirstRow(result)?.total ?? 0;
    }
}
//# sourceMappingURL=ai-governance.repository.js.map