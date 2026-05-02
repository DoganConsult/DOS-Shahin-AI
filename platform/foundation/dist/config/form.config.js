"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_FORM_CONFIGS = void 0;
const baseEntityFields = [
    { key: 'code', labelKey: 'foundation.fields.code', type: 'text', required: true, pattern: '^[A-Z0-9_-]{2,32}$' },
    { key: 'nameEn', labelKey: 'foundation.fields.nameEn', type: 'text', required: true },
    { key: 'nameAr', labelKey: 'foundation.fields.nameAr', type: 'text' },
    { key: 'parentId', labelKey: 'foundation.fields.parent', type: 'reference', optionsEndpoint: '/api/foundation/organizations?status=active&limit=200' },
    { key: 'ownerId', labelKey: 'foundation.fields.owner', type: 'reference', optionsEndpoint: '/api/users?status=active&limit=200' },
];
exports.FOUNDATION_FORM_CONFIGS = {
    'organization-create': {
        variant: 'organization-create',
        submitEndpoint: '/api/foundation/organizations',
        method: 'POST',
        schemaRef: 'foundationNodeCreateBody',
        approvalRequired: false,
        fields: baseEntityFields,
    },
    'business-unit-create': {
        variant: 'business-unit-create',
        submitEndpoint: '/api/foundation/business-units',
        method: 'POST',
        schemaRef: 'foundationNodeCreateBody',
        approvalRequired: false,
        fields: baseEntityFields,
    },
    'department-create': {
        variant: 'department-create',
        submitEndpoint: '/api/foundation/departments',
        method: 'POST',
        schemaRef: 'foundationNodeCreateBody',
        approvalRequired: false,
        fields: baseEntityFields,
    },
};
//# sourceMappingURL=form.config.js.map