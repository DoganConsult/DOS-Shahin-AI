export function toRun(row) {
    return { id: row.id, tenant_id: row.tenant_id, run_type: row.run_type, status: row.status, config: typeof row.config === 'string' ? JSON.parse(row.config) : (row.config ?? {}), started_at: row.started_at?.toISOString?.() ?? row.started_at, completed_at: row.completed_at?.toISOString?.() ?? row.completed_at, error_message: row.error_message };
}
export function toRunList(rows) { return rows.map(toRun); }
export function toResult(row) {
    return { id: row.id, run_id: row.run_id, result_type: row.result_type, data: typeof row.data === 'string' ? JSON.parse(row.data) : (row.data ?? {}), severity: row.severity, created_at: row.created_at?.toISOString?.() ?? row.created_at };
}
//# sourceMappingURL=agrc-engine.mapper.js.map