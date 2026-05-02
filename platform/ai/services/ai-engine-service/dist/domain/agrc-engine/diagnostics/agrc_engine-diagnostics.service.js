import { safeQuery, tenantSchema } from '../ports/database.port.js';
export async function runDiagnostics(tenantId) {
    const schema = tenantSchema(tenantId);
    const checks = [];
    const { rows: schemaRows } = await safeQuery(`SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`, [schema]).catch(() => ({ rows: [] }));
    checks.push({ name: 'schema_exists', passed: schemaRows.length > 0 });
    const ownedTables = ['agrc_engine_runs', 'agrc_engine_results', 'agrc_engine_config'];
    const { rows: tableRows } = await safeQuery(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1 AND table_name = ANY($2)`, [schema, ownedTables]).catch(() => ({ rows: [] }));
    checks.push({
        name: 'tables_exist',
        passed: tableRows.length === ownedTables.length,
        detail: `${tableRows.length}/${ownedTables.length} core agrc-engine tables found`,
    });
    const { rows: staleRows } = await safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".agrc_engine_runs WHERE updated_at < NOW() - INTERVAL '90 days'`, []).catch(() => ({ rows: [{ cnt: 0 }] }));
    const staleCount = parseInt(String(staleRows[0]?.cnt ?? 0), 10);
    checks.push({
        name: 'stale_records',
        passed: staleCount < 50,
        detail: staleCount > 0 ? `${staleCount} records not updated in 90 days` : undefined,
    });
    const { rows: configRows } = await safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".module_configs WHERE module_code = $1`, ['agrc-engine']).catch(() => ({ rows: [{ cnt: 0 }] }));
    const configCount = parseInt(String(configRows[0]?.cnt ?? 0), 10);
    checks.push({
        name: 'module_config_exists',
        passed: configCount > 0,
        detail: configCount === 0 ? 'No module configuration found' : undefined,
    });
    const { rows: auditRows } = await safeQuery(`SELECT COUNT(*) AS cnt FROM "${schema}".audit_trail WHERE module = 'agrc-engine' AND created_at > NOW() - INTERVAL '24 hours'`, []).catch(() => ({ rows: [{ cnt: 0 }] }));
    const auditCount = parseInt(String(auditRows[0]?.cnt ?? 0), 10);
    checks.push({
        name: 'recent_audit_activity',
        passed: auditCount > 0,
        detail: auditCount === 0 ? 'No audit trail entries in last 24 hours' : `${auditCount} entries in last 24h`,
    });
    return {
        moduleCode: 'agrc-engine',
        healthy: checks.every((c) => c.passed),
        checks,
        checkedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=agrc_engine-diagnostics.service.js.map