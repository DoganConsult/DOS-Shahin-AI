export const EXCEPTION_STATUSES = ['draft', 'pending', 'approved', 'active', 'expired', 'revoked', 'closed', 'archived'] as const;

export const EXCEPTION_DEFAULT_STATUS: typeof EXCEPTION_STATUSES[number] = 'draft';

export const EXCEPTION_TERMINAL_STATUSES = ['revoked', 'closed', 'archived'] as const;

export const EXCEPTION_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 20,
  MAX_BULK_OPERATION_SIZE: 50,
  MAX_EXPORT_ROWS: 5000,
  MAX_IMPORT_ROWS: 1000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 50,
  MAX_DURATION_DAYS: 730,
  MAX_RENEWAL_COUNT: 3,
  MAX_APPROVERS: 5,
} as const;

export const EXCEPTION_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 72,
  ESCALATION_AFTER_HOURS: 24,
  REMINDER_BEFORE_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
  EXPIRY_REMINDER_DAYS: 30,
} as const;

export const EXCEPTION_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const EXCEPTION_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 15,
} as const;

export const EXCEPTION_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 30,
  EXPIRY_WARNING_DAYS: 30,
  EXPIRY_CRITICAL_DAYS: 7,
} as const;

export const EXCEPTION_TYPES = ['policy', 'control', 'technical', 'process', 'regulatory', 'security'] as const;

export const EXCEPTION_RISK_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

export const EXCEPTION_COMPENSATING_CONTROLS = true as const;

export const EXCEPTION_APPROVAL_CHAINS = ['single', 'sequential', 'parallel', 'majority'] as const;
