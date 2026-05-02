export const INBOX_STATUSES = ['unread', 'read', 'actioned', 'archived', 'deleted'] as const;

export const INBOX_DEFAULT_STATUS: typeof INBOX_STATUSES[number] = 'unread';

export const INBOX_TERMINAL_STATUSES = ['deleted'] as const;

export const INBOX_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_BODY_LENGTH: 50000,
  MAX_THREAD_DEPTH: 50,
  MAX_BULK_OPERATION_SIZE: 500,
  MAX_EXPORT_ROWS: 10000,
  MAX_INBOX_SIZE: 10000,
} as const;

export const INBOX_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 24,
  ESCALATION_AFTER_HOURS: 8,
  REMINDER_BEFORE_HOURS: 4,
  AUTO_ARCHIVE_AFTER_DAYS: 90,
  SESSION_TIMEOUT_MINUTES: 30,
  ACTION_EXPIRY_DAYS: 7,
} as const;

export const INBOX_SLA_DEFAULTS = {
  critical: 1,
  high: 4,
  medium: 24,
  low: 72,
} as const;

export const INBOX_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/json'],
  MAX_FILE_SIZE_MB: 10,
  MAX_FILES_PER_ENTITY: 5,
} as const;

export const INBOX_BUSINESS_THRESHOLDS = {
  UNREAD_WARNING_COUNT: 50,
  UNREAD_CRITICAL_COUNT: 200,
  ACTION_OVERDUE_HOURS: 48,
  STALE_AFTER_DAYS: 30,
} as const;
