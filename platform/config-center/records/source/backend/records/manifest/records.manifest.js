"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORDS_MANIFEST_META = exports.RECORDS_MANIFEST = void 0;
const records_module_1 = require("../records.module");
Object.defineProperty(exports, "RECORDS_MANIFEST", { enumerable: true, get: function () { return records_module_1.RECORDS_MANIFEST; } });
exports.RECORDS_MANIFEST_META = {
    code: records_module_1.RECORDS_MANIFEST.code,
    version: records_module_1.RECORDS_MANIFEST.version,
    tier: records_module_1.RECORDS_MANIFEST.tier,
    category: records_module_1.RECORDS_MANIFEST.category,
    routeBase: records_module_1.RECORDS_MANIFEST.routeBase,
    eventNamespace: records_module_1.RECORDS_MANIFEST.eventNamespace,
    tablePrefix: records_module_1.RECORDS_MANIFEST.tablePrefix,
    ownedTables: records_module_1.RECORDS_MANIFEST.ownedTables,
    publishedEvents: records_module_1.RECORDS_MANIFEST.publishedEvents,
    consumedEvents: records_module_1.RECORDS_MANIFEST.consumedEvents,
    hardDeps: records_module_1.RECORDS_MANIFEST.hardDeps,
    softDeps: records_module_1.RECORDS_MANIFEST.softDeps,
    provisioningOrder: records_module_1.RECORDS_MANIFEST.provisioningOrder,
    lifecycleParticipation: true,
    uiSurfaces: [
        'records-hub',
        'record-detail',
        'retention-policies',
        'legal-holds',
        'classification-views',
        'disposal-management',
        'diagnostics',
    ],
    adminSurfaces: records_module_1.RECORDS_MANIFEST.adminSurfaces,
    healthSignals: ['schema_exists', 'tables_exist', 'overdue_disposals', 'active_holds', 'retention_policy_coverage', 'unclassified_records'],
};
//# sourceMappingURL=records.manifest.js.map