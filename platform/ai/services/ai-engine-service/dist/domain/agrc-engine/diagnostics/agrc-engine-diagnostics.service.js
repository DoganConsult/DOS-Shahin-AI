import { safeQuery, tenantSchema } from '../ports/database.port.js';
export async function runDiagnostics(tenantId) {
    const schema = tenantSchema(tenantId);
    const checks = [];
    // Check schema exists
    const { rows: schemaRows } = await safeQuery(`SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`, [schema]).catch(() => ({ rows: [] }));
    checks.push({ name: 'schema_exists', passed: schemaRows.length > 0 });
    // Check owned tables exist (replace with actual owned tables from manifest)
    const { rows: tableRows } = await safeQuery(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]).catch(() => ({ rows: [] }));
    checks.push({ name: 'tables_exist', passed: tableRows.length > 0, detail: `${tableRows.length} tables found` });
    return {
        moduleCode: 'agrc-engine',
        healthy: checks.every(c => c.passed),
        checks,
        checkedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=agrc-engine-diagnostics.service.js.map