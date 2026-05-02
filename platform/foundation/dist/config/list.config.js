"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOUNDATION_LIST_CONFIGS = void 0;
const baseColumns = [
    { key: 'code', labelKey: 'foundation.fields.code', type: 'text', sortable: true, searchable: true },
    { key: 'nameEn', labelKey: 'foundation.fields.nameEn', type: 'text', sortable: true, searchable: true },
    { key: 'nameAr', labelKey: 'foundation.fields.nameAr', type: 'text', sortable: true },
    { key: 'status', labelKey: 'foundation.fields.status', type: 'badge', sortable: true },
    { key: 'updatedAt', labelKey: 'foundation.fields.updatedAt', type: 'date', sortable: true },
];
const baseFilters = [
    { key: 'q', labelKey: 'foundation.actions.search', type: 'text' },
    { key: 'status', labelKey: 'foundation.fields.status', type: 'select',
        options: [
            { value: 'draft', labelKey: 'foundation.status.draft' },
            { value: 'in_review', labelKey: 'foundation.status.in_review' },
            { value: 'active', labelKey: 'foundation.status.active' },
            { value: 'suspended', labelKey: 'foundation.status.suspended' },
            { value: 'archived', labelKey: 'foundation.status.archived' },
        ] },
];
const baseActions = [
    { key: 'create', labelKey: 'foundation.actions.create', variant: 'primary', permission: 'foundation.org.write', scope: 'page' },
    { key: 'edit', labelKey: 'foundation.actions.edit', variant: 'secondary', permission: 'foundation.org.write', scope: 'row' },
    { key: 'delete', labelKey: 'foundation.actions.delete', variant: 'danger', permission: 'foundation:delete', scope: 'row' },
    { key: 'export', labelKey: 'foundation.actions.export', variant: 'secondary', permission: 'foundation.org.read', scope: 'page' },
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