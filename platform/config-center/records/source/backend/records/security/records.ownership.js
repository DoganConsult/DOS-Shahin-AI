"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RECORDS_OWNERSHIP_RULES = void 0;
exports.RECORDS_OWNERSHIP_RULES = [
    { entityType: 'record_entry', defaultOwnerRole: 'records.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'record_entry entities require module lead ownership' },
    { entityType: 'record_category', defaultOwnerRole: 'records.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'record_category entities require module lead ownership' },
];
//# sourceMappingURL=records.ownership.js.map