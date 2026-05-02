"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_OWNERSHIP_RULES = void 0;
exports.FOUNDATION_OWNERSHIP_RULES = [
    { entityType: 'organization', defaultOwnerRole: 'foundation.executive_owner', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'Organization entities require executive ownership' },
    { entityType: 'department', defaultOwnerRole: 'foundation.module_lead', canDelegate: true, requiresApproval: false, ownershipField: 'head_user_id', descriptionEn: 'Departments are owned by department heads' },
    { entityType: 'location', defaultOwnerRole: 'foundation.module_lead', canDelegate: false, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'Locations are owned by module leads' },
    { entityType: 'reference_data', defaultOwnerRole: 'foundation.contributor', canDelegate: false, requiresApproval: true, ownershipField: 'created_by', descriptionEn: 'Reference data changes require approval' },
];
//# sourceMappingURL=foundation.ownership.js.map