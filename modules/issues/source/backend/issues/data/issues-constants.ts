export const ISSUES_STATUSES = ['open', 'triaged', 'investigating', 'in_progress', 'pending_verification', 'resolved', 'closed', 'archived'] as const;

export const ISSUES_DEFAULT_STATUS: typeof ISSUES_STATUSES[number] = 'open';

export const ISSUES_TERMINAL_STATUSES = ['closed', 'archived'] as const;

export const ISSUES_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 100,
} as const;

export const ISSUES_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 168,
  ESCALATION_AFTER_HOURS: 72,
  REMINDER_BEFORE_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
} as const;

export const ISSUES_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const ISSUES_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const ISSUES_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 90,
} as const;
