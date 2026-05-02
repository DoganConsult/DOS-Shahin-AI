"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_MANIFEST_META = exports.ANALYTICS_MANIFEST = void 0;
const analytics_module_1 = require("../analytics.module");
Object.defineProperty(exports, "ANALYTICS_MANIFEST", { enumerable: true, get: function () { return analytics_module_1.ANALYTICS_MANIFEST; } });
exports.ANALYTICS_MANIFEST_META = {
    code: analytics_module_1.ANALYTICS_MANIFEST.code,
    version: analytics_module_1.ANALYTICS_MANIFEST.version,
    tier: analytics_module_1.ANALYTICS_MANIFEST.tier,
    category: analytics_module_1.ANALYTICS_MANIFEST.category,
    routeBase: analytics_module_1.ANALYTICS_MANIFEST.routeBase,
    eventNamespace: analytics_module_1.ANALYTICS_MANIFEST.eventNamespace,
    tablePrefix: analytics_module_1.ANALYTICS_MANIFEST.tablePrefix,
    ownedTables: analytics_module_1.ANALYTICS_MANIFEST.ownedTables,
    publishedEvents: analytics_module_1.ANALYTICS_MANIFEST.publishedEvents,
    consumedEvents: analytics_module_1.ANALYTICS_MANIFEST.consumedEvents,
    hardDeps: analytics_module_1.ANALYTICS_MANIFEST.hardDeps,
    softDeps: analytics_module_1.ANALYTICS_MANIFEST.softDeps,
    provisioningOrder: analytics_module_1.ANALYTICS_MANIFEST.provisioningOrder,
    lifecycleParticipation: false,
    uiSurfaces: [
        'analytics-hub',
        'custom-dashboards',
        'metric-explorer',
        'dataset-management',
        'snapshot-views',
        'diagnostics',
    ],
    adminSurfaces: analytics_module_1.ANALYTICS_MANIFEST.adminSurfaces,
    healthSignals: ['schema_exists', 'tables_exist', 'refresh_schedule_healthy', 'stale_snapshots', 'cache_freshness'],
};
//# sourceMappingURL=analytics.manifest.js.map