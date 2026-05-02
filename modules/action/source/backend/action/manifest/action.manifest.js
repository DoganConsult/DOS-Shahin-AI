"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_MANIFEST_META = exports.ACTION_MANIFEST = void 0;
const action_module_1 = require("../action.module");
Object.defineProperty(exports, "ACTION_MANIFEST", { enumerable: true, get: function () { return action_module_1.ACTION_MANIFEST; } });
exports.ACTION_MANIFEST_META = {
    code: action_module_1.ACTION_MANIFEST.code,
    version: action_module_1.ACTION_MANIFEST.version,
    tier: action_module_1.ACTION_MANIFEST.tier,
    category: action_module_1.ACTION_MANIFEST.category,
    routeBase: action_module_1.ACTION_MANIFEST.routeBase,
    eventNamespace: action_module_1.ACTION_MANIFEST.eventNamespace,
    tablePrefix: action_module_1.ACTION_MANIFEST.tablePrefix,
    ownedTables: action_module_1.ACTION_MANIFEST.ownedTables,
    publishedEvents: action_module_1.ACTION_MANIFEST.publishedEvents,
    consumedEvents: action_module_1.ACTION_MANIFEST.consumedEvents,
    hardDeps: action_module_1.ACTION_MANIFEST.hardDeps,
    softDeps: action_module_1.ACTION_MANIFEST.softDeps,
    provisioningOrder: action_module_1.ACTION_MANIFEST.provisioningOrder,
    lifecycleParticipation: true,
    uiSurfaces: [
        'action-hub',
        'action-detail',
        'assignment-views',
        'recurrence-management',
        'dependency-tracker',
        'time-tracking',
        'diagnostics',
    ],
    adminSurfaces: action_module_1.ACTION_MANIFEST.adminSurfaces,
    healthSignals: ['schema_exists', 'tables_exist', 'overdue_actions', 'stale_assignments', 'recurrence_integrity'],
};
//# sourceMappingURL=action.manifest.js.map