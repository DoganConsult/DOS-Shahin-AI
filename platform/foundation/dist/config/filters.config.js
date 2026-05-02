"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_PERMISSION_FILTER_VALUES = exports.FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS = exports.FOUNDATION_STATUS_FILTER_OPTIONS = void 0;
/**
 * Static filter-option catalog for the Foundation module. Reusable across
 * list/form/detail variants. Endpoint-driven options live in the variant
 * configs themselves; this file only holds enumerations stable enough to
 * ship as code.
 */
const foundation_permissions_1 = require("../contracts/foundation.permissions");
exports.FOUNDATION_STATUS_FILTER_OPTIONS = [
    { value: 'draft', labelKey: 'foundation.status.draft' },
    { value: 'in_review', labelKey: 'foundation.status.in_review' },
    { value: 'approved', labelKey: 'foundation.status.approved' },
    { value: 'published', labelKey: 'foundation.status.published' },
    { value: 'active', labelKey: 'foundation.status.active' },
    { value: 'suspended', labelKey: 'foundation.status.suspended' },
    { value: 'archived', labelKey: 'foundation.status.archived' },
];
exports.FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS = [
    { value: 'organization', labelKey: 'foundation.nav.organization' },
    { value: 'business_unit', labelKey: 'foundation.nav.businessUnits' },
    { value: 'department', labelKey: 'foundation.nav.departments' },
    { value: 'position', labelKey: 'foundation.nav.positions' },
    { value: 'legal_entity', labelKey: 'foundation.nav.organization' },
];
exports.FOUNDATION_PERMISSION_FILTER_VALUES = Object.values(foundation_permissions_1.FOUNDATION_PERMISSION_CODES);
//# sourceMappingURL=filters.config.js.map