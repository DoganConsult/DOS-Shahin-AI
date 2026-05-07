/**
 * Runtime list-view config for the Foundation module.
 *
 * Served by the Module-Config API at:
 *   GET /api/module-config/foundation/list/:variant?
 *
 * Variants map to the foundation pages (organization, business-units,
 * departments, positions, locations, committees, delegations, …). Frontend
 * resolves columns/filters/actions dynamically from this contract — no
 * hardcoded page assumptions.
 */
import type { FoundationEntityType } from '../contracts/foundation.types';
export interface ListColumnConfig {
    key: string;
    i18nKey: string;
    type: 'text' | 'date' | 'badge' | 'link' | 'boolean' | 'number';
    sortable?: boolean;
    searchable?: boolean;
    permission?: string;
    width?: number;
}
export interface ListFilterConfig {
    key: string;
    i18nKey: string;
    type: 'text' | 'select' | 'date-range' | 'boolean';
    options?: {
        value: string;
        i18nKey: string;
    }[];
    optionsEndpoint?: string;
}
export interface ListActionConfig {
    key: string;
    i18nKey: string;
    variant: 'primary' | 'secondary' | 'danger';
    permission: string;
    scope: 'row' | 'bulk' | 'page';
}
export interface ListVariantConfig {
    variant: string;
    entityType?: FoundationEntityType | 'committee' | 'delegation' | 'invitation';
    defaultSort: {
        key: string;
        direction: 'asc' | 'desc';
    };
    pageSize: number;
    columns: ListColumnConfig[];
    filters: ListFilterConfig[];
    actions: ListActionConfig[];
    exportModes: ('csv' | 'xlsx' | 'pdf' | 'json')[];
}
export declare const FOUNDATION_LIST_CONFIGS: Record<string, ListVariantConfig>;
