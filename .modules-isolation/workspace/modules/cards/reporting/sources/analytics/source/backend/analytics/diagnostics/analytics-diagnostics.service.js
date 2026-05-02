"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.runDiagnostics = runDiagnostics;
const database_port_1 = require("../ports/database.port");
const analytics_constants_1 = require("../data/analytics-constants");
/**
 * Analytics module diagnostics -- deep health checks beyond basic schema presence.
 *
 * Covers:
 *   - Schema and table existence
 *   - Data freshness (KPI snapshots, dashboard updates)
 *   - KPI computation health (active definitions, recent snapshots)
 *   - Cross-module data availability (risk, compliance, evidence sources)
 *   - Materialized view / cache freshness
 *   - Stale dashboard detection
 *
 * MP-12 SS12: Diagnostics and admin requirements.
 */
async function runDiagnostics(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const checks = [];
    // 1. Check schema exists
    const { rows: schemaRows } = await (0, database_port_1.safeQuery)(`SELECT 1 FROM information_schema.schemata WHERE schema_name = $1`, [schema]).catch(() => ({ rows: [] }));
    checks.push({ name: 'schema_exists', passed: schemaRows.length > 0 });
    // 2. Check owned tables exist
    const requiredTables = [
        'analytics_dashboards', 'analytics_datasets', 'analytics_metrics',
        'analytics_widgets', 'analytics_cache',
    ];
    const { rows: tableRows } = await (0, database_port_1.safeQuery)(`SELECT table_name FROM information_schema.tables WHERE table_schema = $1`, [schema]).catch(() => ({ rows: [] }));
    const existingTables = new Set(tableRows.map((r) => r.table_name));
    const missingTables = requiredTables.filter(t => !existingTables.has(t));
    checks.push({
        name: 'owned_tables_exist',
        passed: missingTables.length === 0,
        detail: missingTables.length === 0
            ? `All ${requiredTables.length} required tables present`
            : `Missing: ${missingTables.join(', ')}`,
    });
    // 3. KPI snapshot freshness -- check if snapshots exist within the last 48 hours
    const { rows: snapshotRows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS recent_count
     FROM "${schema}".analytics_kpi_snapshots
     WHERE deleted_at IS NULL AND computed_at > NOW() - INTERVAL '48 hours'`).catch(() => ({ rows: [{ recent_count: 0 }] }));
    const recentSnapshots = snapshotRows[0]?.recent_count || 0;
    checks.push({
        name: 'kpi_snapshot_freshness',
        passed: recentSnapshots > 0,
        detail: `${recentSnapshots} snapshots computed in last 48h`,
    });
    // 4. Active KPI definitions -- at least one enabled definition
    const { rows: kpiDefRows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS active_count
     FROM "${schema}".analytics_kpi_definitions
     WHERE deleted_at IS NULL AND enabled = true`).catch(() => ({ rows: [{ active_count: 0 }] }));
    const activeKpiDefs = kpiDefRows[0]?.active_count || 0;
    checks.push({
        name: 'active_kpi_definitions',
        passed: activeKpiDefs > 0,
        detail: `${activeKpiDefs} active KPI definitions`,
    });
    // 5. Dashboard freshness -- check for stale published dashboards
    const { rows: staleDashRows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS stale_count
     FROM "${schema}".analytics_dashboards
     WHERE deleted_at IS NULL AND status IN ('active', 'published')
       AND updated_at < NOW() - INTERVAL '${analytics_constants_1.ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS} days'`).catch(() => ({ rows: [{ stale_count: 0 }] }));
    const staleDashboards = staleDashRows[0]?.stale_count || 0;
    checks.push({
        name: 'dashboard_freshness',
        passed: staleDashboards === 0,
        detail: staleDashboards === 0
            ? 'All active dashboards are fresh'
            : `${staleDashboards} dashboards stale (>${analytics_constants_1.ANALYTICS_BUSINESS_THRESHOLDS.STALE_REPORT_DAYS} days)`,
    });
    // 6. Widget refresh health -- check for failed refresh flags
    const { rows: failedWidgetRows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS failed_count
     FROM "${schema}".analytics_widgets
     WHERE deleted_at IS NULL AND refresh_failed = true`).catch(() => ({ rows: [{ failed_count: 0 }] }));
    const failedWidgets = failedWidgetRows[0]?.failed_count || 0;
    checks.push({
        name: 'widget_refresh_health',
        passed: failedWidgets === 0,
        detail: failedWidgets === 0
            ? 'All widgets refreshing successfully'
            : `${failedWidgets} widgets with failed refresh`,
    });
    // 7. Cross-module data availability -- check that source tables exist
    const crossModuleSources = ['risks', 'controls', 'evidence_tasks', 'remediation_tasks'];
    const { rows: crossRows } = await (0, database_port_1.safeQuery)(`SELECT table_name FROM information_schema.tables
     WHERE table_schema = $1 AND table_name = ANY($2)`, [schema, crossModuleSources]).catch(() => ({ rows: [] }));
    const availableSources = crossRows.map((r) => r.table_name);
    const missingSources = crossModuleSources.filter(t => !availableSources.includes(t));
    checks.push({
        name: 'cross_module_data_sources',
        passed: missingSources.length === 0,
        detail: missingSources.length === 0
            ? `All ${crossModuleSources.length} cross-module sources available`
            : `Missing sources: ${missingSources.join(', ')}`,
    });
    // 8. Cache health -- check analytics_cache table age
    const { rows: cacheRows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total,
            COUNT(*) FILTER (WHERE updated_at < NOW() - INTERVAL '${analytics_constants_1.ANALYTICS_TIMEOUTS.CACHE_TTL_MINUTES} minutes')::int AS stale
     FROM "${schema}".analytics_cache
     WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ total: 0, stale: 0 }] }));
    const cacheTotal = cacheRows[0]?.total || 0;
    const cacheStale = cacheRows[0]?.stale || 0;
    checks.push({
        name: 'cache_freshness',
        passed: cacheTotal === 0 || cacheStale < cacheTotal * 0.5,
        detail: cacheTotal === 0
            ? 'No cache entries (normal for fresh tenant)'
            : `${cacheStale}/${cacheTotal} cache entries stale (>${analytics_constants_1.ANALYTICS_TIMEOUTS.CACHE_TTL_MINUTES}m)`,
    });
    // 9. KPI threshold configuration -- at least one threshold set
    const { rows: thresholdRows } = await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS count
     FROM "${schema}".analytics_kpi_thresholds
     WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ count: 0 }] }));
    const thresholdCount = thresholdRows[0]?.count || 0;
    checks.push({
        name: 'kpi_thresholds_configured',
        passed: thresholdCount > 0,
        detail: `${thresholdCount} KPI thresholds configured`,
    });
    return {
        moduleCode: 'analytics',
        healthy: checks.every(c => c.passed),
        checks,
        checkedAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=analytics-diagnostics.service.js.map