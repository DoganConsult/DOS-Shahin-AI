/**
 * View / preset / preference defaults for the Foundation module.
 *   GET /api/module-config/foundation/views/:variant
 */
export interface SavedViewConfig {
    key: string;
    i18nKey: string;
    isDefault?: boolean;
    filters?: Record<string, unknown>;
    sort?: {
        key: string;
        direction: 'asc' | 'desc';
    };
    visibleColumns?: string[];
}
export declare const FOUNDATION_DEFAULT_VIEWS: Record<string, SavedViewConfig[]>;
