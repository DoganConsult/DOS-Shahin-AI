import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
export function getAgrcEngineSeedData() {
    return {
        defaultConfigs: { moduleCode: 'agrc-engine', automationEnabled: true, ccmScanInterval: 3600, telemetryInterval: 300, maxConcurrentRuns: 3 },
    };
}
export async function seedAgrcEngineModule(tenantId, schema) {
    const data = getAgrcEngineSeedData();
    const { safeQuery } = await import('@dos/db');
    for (const [key, value] of Object.entries(data.defaultConfigs)) {
        await safeQuery(`INSERT INTO "${schema}".module_configs (module_code, config_key, config_value, tenant_id) VALUES ($1, $2, $3, $4) ON CONFLICT (module_code, config_key, tenant_id) DO NOTHING`, ['agrc-engine', key, JSON.stringify(value), tenantId]).catch(catchHandler(EC.EVENT_BUS));
    }
}
//# sourceMappingURL=agrc-engine-seed.js.map