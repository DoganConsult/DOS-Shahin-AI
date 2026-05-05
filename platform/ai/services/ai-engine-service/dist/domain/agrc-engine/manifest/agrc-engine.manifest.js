import { AGRC_ENGINE_MANIFEST } from '../agrc_engine.module';
export { AGRC_ENGINE_MANIFEST };
export const AGRC_ENGINE_MANIFEST_META = {
    code: AGRC_ENGINE_MANIFEST.code,
    version: AGRC_ENGINE_MANIFEST.version,
    tier: AGRC_ENGINE_MANIFEST.tier,
    category: AGRC_ENGINE_MANIFEST.category,
    routeBase: AGRC_ENGINE_MANIFEST.routeBase,
    eventNamespace: AGRC_ENGINE_MANIFEST.eventNamespace,
    tablePrefix: AGRC_ENGINE_MANIFEST.tablePrefix,
    ownedTables: AGRC_ENGINE_MANIFEST.ownedTables,
    publishedEvents: AGRC_ENGINE_MANIFEST.publishedEvents,
    consumedEvents: AGRC_ENGINE_MANIFEST.consumedEvents,
    hardDeps: AGRC_ENGINE_MANIFEST.hardDeps,
    softDeps: AGRC_ENGINE_MANIFEST.softDeps,
    provisioningOrder: AGRC_ENGINE_MANIFEST.provisioningOrder,
    lifecycleParticipation: false,
    uiSurfaces: [
        'agrc-orchestration',
        'ccm-views',
        'telemetry-dashboard',
        'automation-monitor',
        'diagnostics',
    ],
    adminSurfaces: AGRC_ENGINE_MANIFEST.adminSurfaces,
    healthSignals: ['schema_exists', 'tables_exist', 'orchestration_healthy', 'telemetry_pipeline_active'],
};
//# sourceMappingURL=agrc-engine.manifest.js.map