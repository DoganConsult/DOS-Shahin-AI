export const ANALYTICS_STATUSES = ['draft', 'active', 'published', 'deprecated', 'archived'] as const;

export const ANALYTICS_DEFAULT_STATUS: typeof ANALYTICS_STATUSES[number] = 'draft';

export const ANALYTICS_TERMINAL_STATUSES = ['archived'] as const;

export const ANALYTICS_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_DATE_RANGE_DAYS: 730,
  MAX_FILTERS: 20,
  MAX_DATA_SOURCES: 10,
  MAX_EXPORT_ROWS: 50000,
  CACHE_MAX_ENTRIES: 1000,
  MAX_ITEMS_PER_PAGE: 50,
  MAX_WIDGETS_PER_DASHBOARD: 50,
} as const;

export const ANALYTICS_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 24,
  ESCALATION_AFTER_HOURS: 8,
  REMINDER_BEFORE_HOURS: 4,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
  GENERATION_TIMEOUT_SECONDS: 120,
  CACHE_TTL_MINUTES: 30,
} as const;

export const ANALYTICS_SLA_DEFAULTS = {
  critical: 1,
  high: 4,
  medium: 24,
  low: 72,
} as const;

export const ANALYTICS_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/png'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const ANALYTICS_BUSINESS_THRESHOLDS = {
  STALE_REPORT_DAYS: 30,
  MIN_DATA_POINTS: 5,
  MAX_VISUALIZATION_ELEMENTS: 500,
  REFRESH_WARNING_HOURS: 24,
} as const;
