import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { logger } from '../../../ports/logger.port';
import { CANONICAL_AGRC_MODULE_CODES } from '../../../ports/config.port';
// Permission format validation: module.resource.action
function isCanonicalFormat(code) { return /^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(code); }
const LOG_TAG = '[AI-DriftDetector]';
export async function runDriftDetection(tenantId) {
    const drifts = [];
    const schema = tenantSchema(tenantId);
    await detectPermissionFormatDrift(schema, drifts);
    await detectMissingRolePacks(schema, drifts);
    await detectPhantomDashboardPresets(schema, drifts);
    await detectSoDGaps(schema, drifts);
    await detectOrphanModules(schema, drifts);
    await detectUnguardedRoutes(schema, drifts);
    await detectStaleCache(schema, drifts);
    const summary = {
        totalDrifts: drifts.length,
        critical: drifts.filter(d => d.severity === 'critical').length,
        high: drifts.filter(d => d.severity === 'high').length,
        medium: drifts.filter(d => d.severity === 'medium').length,
        low: drifts.filter(d => d.severity === 'low').length,
        modulesAffected: [...new Set(drifts.map(d => d.moduleCode))],
    };
    logger.info(`${LOG_TAG} Drift detection for ${tenantId}: ${summary.totalDrifts} drifts (${summary.critical}C/${summary.high}H/${summary.medium}M/${summary.low}L)`);
    try {
        await safeQuery(`INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('rbac_drift_report', $1, $2, 'platform')`, [JSON.stringify({ summary, driftCount: drifts.length }), summary.critical > 0 ? 'critical' : summary.high > 0 ? 'high' : 'info']);
    }
    catch (err) {
        logger.warn(`${LOG_TAG} Failed to persist drift report for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    const result = { tenantId, timestamp: new Date().toISOString(), drifts, summary };
    try {
        await safeQuery(`INSERT INTO "${schema}".agrc_event_log (event_type, payload, severity, source_service)
       VALUES ('rbac_drift_result', $1, $2, 'platform')`, [JSON.stringify(result), summary.critical > 0 ? 'critical' : summary.high > 0 ? 'high' : 'info']);
    }
    catch (err) {
        logger.warn(`${LOG_TAG} Failed to persist drift result for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return result;
}
export async function getLastDriftReport(tenantId) {
    try {
        const schema = tenantSchema(tenantId);
        const { rows } = await safeQuery(`SELECT payload FROM "${schema}".agrc_event_log
       WHERE event_type = 'rbac_drift_result'
       ORDER BY created_at DESC LIMIT 1`);
        if (rows.length > 0) {
            const data = typeof rows[0].payload === 'string' ? JSON.parse(rows[0].payload) : rows[0].payload;
            return data;
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} getLastDriftReport failed for ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    }
    return null;
}
async function detectPermissionFormatDrift(schema, drifts) {
    try {
        const { rows } = await safeQuery(`SELECT permission_code, module_code FROM "${schema}".module_permissions WHERE is_active = true`);
        for (const r of rows) {
            if (!isCanonicalFormat(r.permission_code)) {
                drifts.push({
                    category: 'permission_format',
                    severity: 'critical',
                    moduleCode: r.module_code,
                    detail: `Permission "${r.permission_code}" is not in canonical module.resource.action format`,
                    suggestedFix: `Update to dot-separated module.resource.action format`,
                });
            }
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} detectPermissionFormatDrift failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function detectMissingRolePacks(schema, drifts) {
    try {
        const { rows } = await safeQuery(`SELECT DISTINCT module_code FROM "${schema}".module_role_definitions WHERE is_active = true`);
        const modulesWithRoles = new Set(rows.map((r) => r.module_code));
        for (const mod of CANONICAL_AGRC_MODULE_CODES) {
            if (!modulesWithRoles.has(mod)) {
                drifts.push({
                    category: 'missing_role_pack',
                    severity: 'high',
                    moduleCode: mod,
                    detail: `Module "${mod}" has no role definitions in DB`,
                    suggestedFix: `Run seed-rbac-data for module "${mod}"`,
                });
            }
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} detectMissingRolePacks failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function detectPhantomDashboardPresets(schema, drifts) {
    try {
        const { rows: activationRows } = await safeQuery(`SELECT module_code, metadata FROM "${schema}".module_activation_rules WHERE is_active = true AND metadata->>'dashboardPresets' IS NOT NULL`);
        const { rows: dashboardRows } = await safeQuery(`SELECT dashboard_code FROM "${schema}".dashboard_layouts WHERE is_active = true`);
        const existingPresets = new Set(dashboardRows.map((r) => r.dashboard_code));
        for (const r of activationRows) {
            const presets = r.metadata?.dashboardPresets || [];
            for (const preset of presets) {
                if (!existingPresets.has(preset)) {
                    drifts.push({
                        category: 'phantom_preset',
                        severity: 'medium',
                        moduleCode: r.module_code,
                        detail: `Dashboard preset "${preset}" referenced by module "${r.module_code}" does not exist`,
                        suggestedFix: `Create dashboard layout "${preset}" or remove reference`,
                    });
                }
            }
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} detectPhantomDashboardPresets failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function detectSoDGaps(schema, drifts) {
    try {
        const { rows: modulesWithActions } = await safeQuery(`SELECT DISTINCT module_code FROM "${schema}".module_actions WHERE is_active = true AND sod_sensitive = true`);
        const { rows: modulesWithSod } = await safeQuery(`SELECT DISTINCT module_code FROM "${schema}".module_sod_rules WHERE is_active = true`);
        const sodModules = new Set(modulesWithSod.map((r) => r.module_code));
        for (const r of modulesWithActions) {
            if (!sodModules.has(r.module_code)) {
                drifts.push({
                    category: 'sod_gap',
                    severity: 'high',
                    moduleCode: r.module_code,
                    detail: `Module "${r.module_code}" has SoD-sensitive actions but no SoD rules defined`,
                    suggestedFix: `Add SoD rules for module "${r.module_code}"`,
                });
            }
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} detectSoDGaps failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function detectOrphanModules(schema, drifts) {
    try {
        const { rows: activatedModules } = await safeQuery(`SELECT module_code FROM "${schema}".module_activation_rules WHERE is_active = true`);
        const activatedSet = new Set(activatedModules.map((r) => r.module_code));
        for (const mod of CANONICAL_AGRC_MODULE_CODES) {
            if (!activatedSet.has(mod)) {
                drifts.push({
                    category: 'orphan_module',
                    severity: 'low',
                    moduleCode: mod,
                    detail: `Canonical module "${mod}" has no activation rule in DB`,
                    suggestedFix: `Add activation rule for "${mod}" or explicitly flag as disabled`,
                });
            }
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} detectOrphanModules failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function detectUnguardedRoutes(schema, drifts) {
    try {
        const { rows } = await safeQuery(`SELECT module_code, path, method FROM "${schema}".route_catalog WHERE is_active = true AND (required_permissions IS NULL OR required_permissions = '[]'::jsonb)`);
        for (const r of rows) {
            drifts.push({
                category: 'unguarded_route',
                severity: 'high',
                moduleCode: r.module_code,
                detail: `Route ${r.method} ${r.path} has no required_permissions`,
                suggestedFix: `Add permission requirements to route "${r.path}" in route_catalog`,
            });
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} detectUnguardedRoutes failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
async function detectStaleCache(schema, drifts) {
    try {
        const { rows } = await safeQuery(`SELECT table_name, MAX(created_at) AS last_change
       FROM "${schema}".rbac_config_audit
       WHERE created_at > NOW() - INTERVAL '24 hours'
       GROUP BY table_name`);
        const { rows: lastDrift } = await safeQuery(`SELECT MAX(created_at) AS last_run FROM "${schema}".agrc_event_log WHERE event_type = 'rbac_drift_result'`);
        const lastRunAt = lastDrift[0]?.last_run ? new Date(lastDrift[0].last_run) : null;
        if (!lastRunAt)
            return;
        for (const r of rows) {
            const changeAt = new Date(r.last_change);
            if (changeAt > lastRunAt) {
                drifts.push({
                    category: 'stale_cache',
                    severity: 'medium',
                    moduleCode: 'platform',
                    detail: `RBAC config in "${r.table_name}" changed after last drift scan (${changeAt.toISOString()} > ${lastRunAt.toISOString()})`,
                    suggestedFix: `Re-run drift detection or invalidate permission cache for affected tenants`,
                });
            }
        }
    }
    catch (err) {
        logger.warn(`${LOG_TAG} detectStaleCache failed: ${err instanceof Error ? err.message : String(err)}`);
    }
}
//# sourceMappingURL=ai-drift-detector.worker.js.map