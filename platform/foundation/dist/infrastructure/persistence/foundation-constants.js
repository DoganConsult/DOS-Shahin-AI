"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_LIMITS = exports.FOUNDATION_DEFAULT_STATUS = exports.FOUNDATION_STATUSES = exports.FOUNDATION_ENTITY_TYPES = void 0;
exports.FOUNDATION_ENTITY_TYPES = ['organization', 'business_unit', 'department', 'position', 'legal_entity'];
exports.FOUNDATION_STATUSES = ['draft', 'in_review', 'approved', 'published', 'active', 'suspended', 'archived'];
exports.FOUNDATION_DEFAULT_STATUS = 'draft';
exports.FOUNDATION_LIMITS = {
    maxDepth: 10,
    maxChildrenPerNode: 100,
    maxNodesPerTenant: 5000,
};
//# sourceMappingURL=foundation-constants.js.map