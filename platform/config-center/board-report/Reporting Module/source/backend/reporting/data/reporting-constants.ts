export const REPORTING_STATUSES = ['draft', 'generating', 'generated', 'distributed', 'expired', 'archived'] as const;

export const REPORTING_DEFAULT_STATUS: typeof REPORTING_STATUSES[number] = 'draft';

export const REPORTING_TERMINAL_STATUSES = ['expired', 'archived'] as const;

export const REPORTING_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_REPORT_SIZE_MB: 50,
  MAX_DATA_SOURCES: 10,
  MAX_TEMPLATE_PAGES: 200,
  MAX_EXPORT_ROWS: 50000,
  MAX_DISTRIBUTION_RECIPIENTS: 100,
} as const;

export const REPORTING_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 24,
  ESCALATION_AFTER_HOURS: 8,
  REMINDER_BEFORE_HOURS: 4,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
  GENERATION_TIMEOUT_SECONDS: 300,
  REPORT_EXPIRY_DAYS: 90,
} as const;

export const REPORTING_SLA_DEFAULTS = {
  critical: 1,
  high: 4,
  medium: 24,
  low: 72,
} as const;

export const REPORTING_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/html'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 10,
} as const;

export const REPORTING_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  STALE_AFTER_DAYS: 90,
  DISTRIBUTION_RETRY_MAX: 3,
} as const;
