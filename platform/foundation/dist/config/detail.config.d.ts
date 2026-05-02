/**
 * Runtime detail-view config for the Foundation module.
 *   GET /api/module-config/foundation/detail/:variant
 */
export interface DetailSection {
    key: string;
    labelKey: string;
    layout: 'one-col' | 'two-col' | 'tabs';
    fields: {
        key: string;
        labelKey: string;
        type: string;
        permission?: string;
    }[];
}
export interface DetailVariantConfig {
    variant: string;
    header: {
        titleKey: string;
        subtitleKey?: string;
    };
    sections: DetailSection[];
    tabs?: {
        key: string;
        labelKey: string;
        loadFromEndpoint: string;
        permission?: string;
    }[];
    actions: {
        key: string;
        labelKey: string;
        permission: string;
        variant: 'primary' | 'secondary' | 'danger';
    }[];
}
export declare const FOUNDATION_DETAIL_CONFIGS: Record<string, DetailVariantConfig>;
