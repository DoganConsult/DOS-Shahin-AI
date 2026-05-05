import { safeQuery, tenantSchema } from '../ports/database.port';
export class AgrcEngineQueryRepository {
    schema;
    constructor(tenantId) { this.schema = tenantSchema(tenantId); }
    async getRunStats() {
        const result = await safeQuery(`SELECT status, COUNT(*)::int AS count FROM "${this.schema}".agrc_engine_runs GROUP BY status`);
        const stats = { total: 0, completed: 0, failed: 0, running: 0 };
        for (const row of result.rows) {
            stats[row.status] = row.count;
            stats.total += row.count;
        }
        return stats;
    }
}
//# sourceMappingURL=agrc-engine-query.repository.js.map