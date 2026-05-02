export const WIDGET_STATUSES = ['draft', 'in_review', 'approved', 'published', 'suspended', 'archived'] as const;
export const WIDGET_CATEGORIES = ['executive', 'insight', 'structural', 'kpi', 'kri', 'compliance', 'risk', 'audit', 'evidence', 'general'] as const;
export const WIDGET_SIZES = ['small', 'medium', 'large', 'full'] as const;
export const WIDGET_LIMITS = { MAX_WIDGETS_PER_BUNDLE: 20, MAX_BUNDLES_PER_TENANT: 50, MAX_DATA_SOURCES: 10, CACHE_TTL_SECONDS: 300, MAX_CONCURRENT_RENDERS: 10 } as const;
