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
    { value: 'draft', i18nKey: 'foundation.status.draft' },
    { value: 'in_review', i18nKey: 'foundation.status.in_review' },
    { value: 'approved', i18nKey: 'foundation.status.approved' },
    { value: 'published', i18nKey: 'foundation.status.published' },
    { value: 'active', i18nKey: 'foundation.status.active' },
    { value: 'suspended', i18nKey: 'foundation.status.suspended' },
    { value: 'archived', i18nKey: 'foundation.status.archived' },
];
exports.FOUNDATION_ENTITY_TYPE_FILTER_OPTIONS = [
    { value: 'organization', i18nKey: 'foundation.nav.organization' },
    { value: 'business_unit', i18nKey: 'foundation.nav.businessUnits' },
    { value: 'department', i18nKey: 'foundation.nav.departments' },
    { value: 'position', i18nKey: 'foundation.nav.positions' },
    { value: 'legal_entity', i18nKey: 'foundation.nav.organization' },
];
exports.FOUNDATION_PERMISSION_FILTER_VALUES = Object.values(foundation_permissions_1.FOUNDATION_PERMISSION_CODES);
//# sourceMappingURL=filters.config.js.map