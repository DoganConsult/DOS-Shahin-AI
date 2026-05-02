"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ASSET_OWNERSHIP_RULES = void 0;
exports.ASSET_OWNERSHIP_RULES = [
    { entityType: 'asset', defaultOwnerRole: 'asset.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'asset entities require module lead ownership' },
    { entityType: 'asset_classification', defaultOwnerRole: 'asset.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'asset_classification entities require module lead ownership' },
    { entityType: 'asset_owner', defaultOwnerRole: 'asset.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'asset_owner entities require module lead ownership' },
];
//# sourceMappingURL=asset.ownership.js.map