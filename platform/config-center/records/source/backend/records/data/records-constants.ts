export const RECORDS_STATUSES = ['active', 'retention', 'review', 'hold', 'disposal_pending', 'disposed', 'archived'] as const;

export const RECORDS_DEFAULT_STATUS: typeof RECORDS_STATUSES[number] = 'active';

export const RECORDS_TERMINAL_STATUSES = ['disposed', 'archived'] as const;

export const RECORDS_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_VERSION_COUNT: 100,
  MAX_LINKED_RECORDS: 50,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_BULK_OPERATION_SIZE: 100,
} as const;

export const RECORDS_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 168,
  ESCALATION_AFTER_HOURS: 72,
  REMINDER_BEFORE_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 2555,
  SESSION_TIMEOUT_MINUTES: 30,
  REVIEW_TIMEOUT_DAYS: 30,
  DISPOSAL_GRACE_DAYS: 14,
} as const;

export const RECORDS_SLA_DEFAULTS = {
  critical: 24,
  high: 72,
  medium: 168,
  low: 720,
} as const;

export const RECORDS_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png', 'image/jpeg', 'text/plain'],
  MAX_FILE_SIZE_MB: 100,
  MAX_FILES_PER_ENTITY: 50,
} as const;

export const RECORDS_BUSINESS_THRESHOLDS = {
  RETENTION_WARNING_DAYS: 30,
  DISPOSAL_OVERDUE_DAYS: 14,
  LEGAL_HOLD_REVIEW_DAYS: 90,
  STALE_AFTER_DAYS: 365,
} as const;
