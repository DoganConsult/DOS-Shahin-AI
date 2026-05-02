"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_DETAIL_CONFIGS = void 0;
const baseHeaderFields = [
    { key: 'code', labelKey: 'foundation.fields.code', type: 'text' },
    { key: 'nameEn', labelKey: 'foundation.fields.nameEn', type: 'text' },
    { key: 'nameAr', labelKey: 'foundation.fields.nameAr', type: 'text' },
    { key: 'status', labelKey: 'foundation.fields.status', type: 'badge' },
];
exports.FOUNDATION_DETAIL_CONFIGS = {
    organization: {
        variant: 'organization',
        header: { titleKey: 'foundation.nav.organization' },
        sections: [
            { key: 'identity', labelKey: 'foundation.module.title', layout: 'two-col', fields: baseHeaderFields },
        ],
        tabs: [
            { key: 'children', labelKey: 'foundation.nav.businessUnits', loadFromEndpoint: '/api/foundation/organizations/:id/children', permission: 'foundation.org.read' },
            { key: 'audit', labelKey: 'foundation.nav.audit', loadFromEndpoint: '/api/foundation/audit-trail?entityId=:id', permission: 'foundation.record.read' },
        ],
        actions: [
            { key: 'edit', labelKey: 'foundation.actions.edit', permission: 'foundation.org.write', variant: 'primary' },
            { key: 'delete', labelKey: 'foundation.actions.delete', permission: 'foundation:delete', variant: 'danger' },
        ],
    },
};
//# sourceMappingURL=detail.config.js.map