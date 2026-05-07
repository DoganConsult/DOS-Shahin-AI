"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_LIST_CONFIGS = void 0;
const baseColumns = [
    { key: 'code', i18nKey: 'foundation.fields.code', type: 'text', sortable: true, searchable: true },
    { key: 'nameEn', i18nKey: 'foundation.fields.nameEn', type: 'text', sortable: true, searchable: true },
    { key: 'nameAr', i18nKey: 'foundation.fields.nameAr', type: 'text', sortable: true },
    { key: 'status', i18nKey: 'foundation.fields.status', type: 'badge', sortable: true },
    { key: 'updatedAt', i18nKey: 'foundation.fields.updatedAt', type: 'date', sortable: true },
];
const baseFilters = [
    { key: 'q', i18nKey: 'foundation.actions.search', type: 'text' },
    { key: 'status', i18nKey: 'foundation.fields.status', type: 'select',
        options: [
            { value: 'draft', i18nKey: 'foundation.status.draft' },
            { value: 'in_review', i18nKey: 'foundation.status.in_review' },
            { value: 'active', i18nKey: 'foundation.status.active' },
            { value: 'suspended', i18nKey: 'foundation.status.suspended' },
            { value: 'archived', i18nKey: 'foundation.status.archived' },
        ] },
];
const baseActions = [
    { key: 'create', i18nKey: 'foundation.actions.create', variant: 'primary', permission: 'foundation.org.write', scope: 'page' },
    { key: 'edit', i18nKey: 'foundation.actions.edit', variant: 'secondary', permission: 'foundation.org.write', scope: 'row' },
    { key: 'delete', i18nKey: 'foundation.actions.delete', variant: 'danger', permission: 'foundation:delete', scope: 'row' },
    { key: 'export', i18nKey: 'foundation.actions.export', variant: 'secondary', permission: 'foundation.org.read', scope: 'page' },
];
// NOTE: only export modes whose backend handler exists today are advertised.
// Foundation list /export endpoints are CSV-only (sendCsv util in csv.util.ts).
// xlsx/pdf were aspirational — restored once a real generator is wired.
exports.FOUNDATION_LIST_CONFIGS = {
    organization: { variant: 'organization', entityType: 'organization', defaultSort: { key: 'updatedAt', direction: 'desc' }, pageSize: 25, columns: baseColumns, filters: baseFilters, actions: baseActions, exportModes: ['csv'] },
    'business-units': { variant: 'business-units', entityType: 'business_unit', defaultSort: { key: 'updatedAt', direction: 'desc' }, pageSize: 25, columns: baseColumns, filters: baseFilters, actions: baseActions, exportModes: ['csv'] },
    departments: { variant: 'departments', entityType: 'department', defaultSort: { key: 'updatedAt', direction: 'desc' }, pageSize: 25, columns: baseColumns, filters: baseFilters, actions: baseActions, exportModes: ['csv'] },
    positions: { variant: 'positions', entityType: 'position', defaultSort: { key: 'updatedAt', direction: 'desc' }, pageSize: 25, columns: baseColumns, filters: baseFilters, actions: baseActions, exportModes: ['csv'] },
    locations: { variant: 'locations', defaultSort: { key: 'updatedAt', direction: 'desc' }, pageSize: 25, columns: baseColumns, filters: baseFilters, actions: baseActions, exportModes: ['csv'] },
    committees: { variant: 'committees', entityType: 'committee', defaultSort: { key: 'updatedAt', direction: 'desc' }, pageSize: 25, columns: baseColumns, filters: baseFilters, actions: baseActions, exportModes: ['csv'] },
    delegations: { variant: 'delegations', entityType: 'delegation', defaultSort: { key: 'updatedAt', direction: 'desc' }, pageSize: 25, columns: baseColumns, filters: baseFilters, actions: baseActions, exportModes: ['csv'] },
};
//# sourceMappingURL=list.config.js.map