import { AI_MANIFEST } from '../ai.module.js';
export { AI_MANIFEST };
export const AI_MANIFEST_META = {
    code: AI_MANIFEST.code,
    version: AI_MANIFEST.version,
    tier: AI_MANIFEST.tier,
    category: AI_MANIFEST.category,
    routeBase: AI_MANIFEST.routeBase,
    eventNamespace: AI_MANIFEST.eventNamespace,
    tablePrefix: AI_MANIFEST.tablePrefix,
    ownedTables: AI_MANIFEST.ownedTables,
    publishedEvents: Object.keys(AI_MANIFEST.publishedEvents ?? {}),
    consumedEvents: Object.keys(AI_MANIFEST.consumedEvents ?? {}),
    hardDeps: AI_MANIFEST.hardDeps,
    softDeps: AI_MANIFEST.softDeps,
    provisioningOrder: AI_MANIFEST.provisioningOrder,
    lifecycleParticipation: true,
    uiSurfaces: [
        'ai-cockpit',
        'agent-hub',
        'agent-detail',
        'decision-trace',
        'recommendations',
        'model-config',
        'ai-diagnostics',
        'code-search-dashboard',
        'code-search-engines',
        'code-search-surfaces',
    ],
    adminSurfaces: AI_MANIFEST.adminSurfaces,
    healthSignals: ['schema_exists', 'tables_exist', 'agent_runtime_healthy', 'llm_gateway_reachable'],
};
//# sourceMappingURL=ai.manifest.js.map