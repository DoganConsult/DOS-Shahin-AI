/**
 * View / preset / preference defaults for the Foundation module.
 *   GET /api/module-config/foundation/views/:variant
 */
export interface SavedViewConfig {
  key: string;
  i18nKey: string;
  isDefault?: boolean;
  filters?: Record<string, unknown>;
  sort?: { key: string; direction: 'asc' | 'desc' };
  visibleColumns?: string[];
}

export const FOUNDATION_DEFAULT_VIEWS: Record<string, SavedViewConfig[]> = {
  organization: [
    { key: 'all-active',     i18nKey: 'foundation.views.allActive',     isDefault: true,  filters: { status: 'active' } },
    { key: 'in-review',      i18nKey: 'foundation.views.inReview',                       filters: { status: 'in_review' } },
    { key: 'archived',       i18nKey: 'foundation.views.archived',                       filters: { status: 'archived' } },
  ],
  'business-units': [
    { key: 'all-active',     i18nKey: 'foundation.views.allActive',     isDefault: true,  filters: { status: 'active' } },
  ],
};
