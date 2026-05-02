/**
 * View / preset / preference defaults for the Foundation module.
 *   GET /api/module-config/foundation/views/:variant
 */
export interface SavedViewConfig {
  key: string;
  labelKey: string;
  isDefault?: boolean;
  filters?: Record<string, unknown>;
  sort?: { key: string; direction: 'asc' | 'desc' };
  visibleColumns?: string[];
}

export const FOUNDATION_DEFAULT_VIEWS: Record<string, SavedViewConfig[]> = {
  organization: [
    { key: 'all-active',     labelKey: 'foundation.views.allActive',     isDefault: true,  filters: { status: 'active' } },
    { key: 'in-review',      labelKey: 'foundation.views.inReview',                       filters: { status: 'in_review' } },
    { key: 'archived',       labelKey: 'foundation.views.archived',                       filters: { status: 'archived' } },
  ],
  'business-units': [
    { key: 'all-active',     labelKey: 'foundation.views.allActive',     isDefault: true,  filters: { status: 'active' } },
  ],
};
