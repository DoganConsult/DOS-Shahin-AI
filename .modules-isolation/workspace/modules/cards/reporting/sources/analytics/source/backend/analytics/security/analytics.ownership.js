"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_OWNERSHIP_RULES = void 0;
exports.ANALYTICS_OWNERSHIP_RULES = [
    { entityType: 'analytics_dashboard', defaultOwnerRole: 'analytics.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'analytics_dashboard entities require operator ownership' },
    { entityType: 'analytics_query', defaultOwnerRole: 'analytics.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'analytics_query entities require operator ownership' },
];
//# sourceMappingURL=analytics.ownership.js.map