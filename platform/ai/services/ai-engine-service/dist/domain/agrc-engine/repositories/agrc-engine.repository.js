import { v4 as uuid } from 'uuid';
import { safeQuery, tenantSchema } from '../ports/database.port.js';
import { getFirstRow } from '@dos/db';
export class AgrcEngineRepository {
    schema;
    constructor(tenantId) { this.schema = tenantSchema(tenantId); }
    async findRunById(runId) {
        const result = await safeQuery(`SELECT * FROM "${this.schema}".agrc_engine_runs WHERE id = $1`, [runId]);
        return getFirstRow(result);
    }
    async findRuns(filters = {}) {
        const conditions = [];
        const params = [];
        let idx = 1;
        if (filters.status) {
            conditions.push(`status = $${idx++}`);
            params.push(filters.status);
        }
        const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
        const limit = Math.min(100, filters.limit || 50);
        params.push(limit);
        const result = await safeQuery(`SELECT * FROM "${this.schema}".agrc_engine_runs ${where} ORDER BY started_at DESC LIMIT $${idx}`, params);
        return result.rows;
    }
    async findResults(runId) {
        const result = await safeQuery(`SELECT * FROM "${this.schema}".agrc_engine_results WHERE run_id = $1 ORDER BY created_at DESC`, [runId]);
        return result.rows;
    }
    async createRun(data) {
        const id = uuid();
        const result = await safeQuery(`INSERT INTO "${this.schema}".agrc_engine_runs (id, tenant_id, run_type, status, config, started_at)
       VALUES ($1, $2, $3, 'running', $4, NOW()) RETURNING *`, [id, data.tenant_id, data.run_type, JSON.stringify(data.config ?? {})]);
        return getFirstRow(result);
    }
    async updateRunStatus(runId, status) {
        const result = await safeQuery(`UPDATE "${this.schema}".agrc_engine_runs SET status = $2, completed_at = CASE WHEN $2 IN ('completed', 'failed') THEN NOW() ELSE completed_at END WHERE id = $1 RETURNING *`, [runId, status]);
        return getFirstRow(result);
    }
    async getConfig() {
        const result = await safeQuery(`SELECT * FROM "${this.schema}".agrc_engine_config LIMIT 1`);
        return getFirstRow(result);
    }
}
//# sourceMappingURL=agrc-engine.repository.js.map