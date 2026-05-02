export const QIYAS_STATUSES = ['draft', 'in_progress', 'completed', 'reviewed', 'published', 'archived'] as const;

export const QIYAS_DEFAULT_STATUS: typeof QIYAS_STATUSES[number] = 'draft';

export const QIYAS_TERMINAL_STATUSES = ['archived'] as const;

export const QIYAS_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 50,
  MAX_EXPORT_ROWS: 5000,
  MAX_IMPORT_ROWS: 2000,
  MAX_QUESTIONS_PER_ASSESSMENT: 200,
  MAX_DOMAINS: 20,
  MAX_RESPONDENTS: 1000,
  MAX_BENCHMARK_GROUPS: 50,
} as const;

export const QIYAS_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 336,
  ESCALATION_AFTER_HOURS: 168,
  REMINDER_BEFORE_HOURS: 48,
  AUTO_ARCHIVE_AFTER_DAYS: 730,
  SESSION_TIMEOUT_MINUTES: 60,
  ASSESSMENT_TIMEOUT_HOURS: 72,
} as const;

export const QIYAS_SLA_DEFAULTS = {
  critical: 48,
  high: 168,
  medium: 336,
  low: 720,
} as const;

export const QIYAS_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'image/png'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const QIYAS_BUSINESS_THRESHOLDS = {
  MATURITY_LEVELS: 5,
  BENCHMARK_MIN_RESPONDENTS: 10,
  MIN_RESPONSE_RATE: 60,
  TARGET_MATURITY_DEFAULT: 3,
  IMPROVEMENT_THRESHOLD_SCORE: 2,
  STALE_AFTER_DAYS: 365,
} as const;
