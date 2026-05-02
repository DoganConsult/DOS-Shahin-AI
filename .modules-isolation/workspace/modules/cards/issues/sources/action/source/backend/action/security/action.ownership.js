"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_OWNERSHIP_RULES = void 0;
exports.ACTION_OWNERSHIP_RULES = [
    { entityType: 'action_plan', defaultOwnerRole: 'action.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'action_plan entities require module lead ownership' },
    { entityType: 'action_task', defaultOwnerRole: 'action.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'action_task entities require module lead ownership' },
    { entityType: 'action_item', defaultOwnerRole: 'action.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'action_item entities require module lead ownership' },
];
//# sourceMappingURL=action.ownership.js.map