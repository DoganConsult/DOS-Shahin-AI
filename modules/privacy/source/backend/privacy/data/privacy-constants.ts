export const PRIVACY_STATUSES = ['draft', 'submitted', 'in_progress', 'pending_review', 'completed', 'closed', 'archived'] as const;

export const PRIVACY_DEFAULT_STATUS: typeof PRIVACY_STATUSES[number] = 'draft';

export const PRIVACY_TERMINAL_STATUSES = ['closed', 'archived'] as const;

export const PRIVACY_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_DATA_CATEGORIES: 50,
  MAX_PROCESSING_ACTIVITIES: 100,
  MAX_EXPORT_ROWS: 5000,
  MAX_BULK_OPERATION_SIZE: 50,
  MAX_CROSS_BORDER_DESTINATIONS: 20,
} as const;

export const PRIVACY_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 720,
  ESCALATION_AFTER_HOURS: 168,
  REMINDER_BEFORE_HOURS: 48,
  AUTO_ARCHIVE_AFTER_DAYS: 2555,
  SESSION_TIMEOUT_MINUTES: 30,
  DSR_RESPONSE_DAYS: 30,
  BREACH_NOTIFICATION_HOURS: 72,
  PIA_COMPLETION_DAYS: 60,
} as const;

export const PRIVACY_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 168,
  low: 720,
} as const;

export const PRIVACY_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const PRIVACY_BUSINESS_THRESHOLDS = {
  DSR_OVERDUE_WARNING_DAYS: 7,
  BREACH_ESCALATION_HOURS: 24,
  CONSENT_EXPIRY_WARNING_DAYS: 30,
  STALE_AFTER_DAYS: 365,
  PIA_REVIEW_INTERVAL_DAYS: 365,
} as const;
