export const PORTALS_STATUSES = ['draft', 'published', 'active', 'suspended', 'archived'] as const;

export const PORTALS_DEFAULT_STATUS: typeof PORTALS_STATUSES[number] = 'draft';

export const PORTALS_TERMINAL_STATUSES = ['archived'] as const;

export const PORTALS_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_CONTENT_MODULES: 15,
  MAX_ALLOWED_ROLES: 50,
  MAX_ALLOWED_DOMAINS: 20,
  MAX_ADMINS: 10,
  MAX_EXPORT_ROWS: 5000,
  MAX_SESSION_CONCURRENT: 500,
} as const;

export const PORTALS_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 24,
  ESCALATION_AFTER_HOURS: 8,
  REMINDER_BEFORE_HOURS: 4,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
  PORTAL_SESSION_MINUTES: 60,
} as const;

export const PORTALS_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const PORTALS_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'image/svg+xml', 'text/html'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const PORTALS_BUSINESS_THRESHOLDS = {
  VISITOR_WARNING_COUNT: 1000,
  INACTIVITY_WARNING_DAYS: 30,
  STALE_AFTER_DAYS: 180,
  MAX_CONCURRENT_VISITORS: 500,
} as const;
