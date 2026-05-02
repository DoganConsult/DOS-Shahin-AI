"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_MANIFEST_META = exports.ASSET_MANIFEST = void 0;
const asset_module_1 = require("../asset.module");
Object.defineProperty(exports, "ASSET_MANIFEST", { enumerable: true, get: function () { return asset_module_1.ASSET_MANIFEST; } });
exports.ASSET_MANIFEST_META = {
    code: asset_module_1.ASSET_MANIFEST.code,
    version: asset_module_1.ASSET_MANIFEST.version,
    tier: asset_module_1.ASSET_MANIFEST.tier,
    category: asset_module_1.ASSET_MANIFEST.category,
    routeBase: asset_module_1.ASSET_MANIFEST.routeBase,
    eventNamespace: asset_module_1.ASSET_MANIFEST.eventNamespace,
    tablePrefix: asset_module_1.ASSET_MANIFEST.tablePrefix,
    ownedTables: asset_module_1.ASSET_MANIFEST.ownedTables,
    publishedEvents: asset_module_1.ASSET_MANIFEST.publishedEvents,
    consumedEvents: asset_module_1.ASSET_MANIFEST.consumedEvents,
    hardDeps: asset_module_1.ASSET_MANIFEST.hardDeps,
    softDeps: asset_module_1.ASSET_MANIFEST.softDeps,
    provisioningOrder: asset_module_1.ASSET_MANIFEST.provisioningOrder,
    lifecycleParticipation: true,
    uiSurfaces: [
        'asset-inventory',
        'asset-detail',
        'classification-views',
        'dependency-maps',
        'vulnerability-tracking',
        'lifecycle-timeline',
        'criticality-dashboard',
        'diagnostics',
    ],
    adminSurfaces: asset_module_1.ASSET_MANIFEST.adminSurfaces,
    healthSignals: ['schema_exists', 'tables_exist', 'unclassified_assets', 'stale_scans', 'ownership_gaps', 'criticality_drift'],
};
//# sourceMappingURL=asset.manifest.js.map