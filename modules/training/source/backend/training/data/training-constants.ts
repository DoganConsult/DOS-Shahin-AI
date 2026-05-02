export const TRAINING_STATUSES = ['draft', 'published', 'enrollment_open', 'in_progress', 'completed', 'expired', 'archived'] as const;

export const TRAINING_DEFAULT_STATUS: typeof TRAINING_STATUSES[number] = 'draft';

export const TRAINING_TERMINAL_STATUSES = ['expired', 'archived'] as const;

export const TRAINING_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_ENROLLMENT_PER_COURSE: 500,
  MAX_COURSE_DURATION_HOURS: 200,
  MAX_ATTEMPTS: 5,
  MAX_QUESTIONS_PER_QUIZ: 100,
  MAX_CURRICULA: 50,
} as const;

export const TRAINING_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 720,
  ESCALATION_AFTER_HOURS: 168,
  REMINDER_BEFORE_HOURS: 48,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 120,
  CERTIFICATION_WARNING_DAYS: 30,
} as const;

export const TRAINING_SLA_DEFAULTS = {
  critical: 24,
  high: 72,
  medium: 168,
  low: 720,
} as const;

export const TRAINING_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'video/mp4', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'image/png', 'image/jpeg', 'application/zip'],
  MAX_FILE_SIZE_MB: 500,
  MAX_FILES_PER_ENTITY: 50,
} as const;

export const TRAINING_BUSINESS_THRESHOLDS = {
  PASSING_SCORE_MIN: 60,
  COMPLETION_RATE_WARNING: 70,
  COMPLETION_RATE_CRITICAL: 50,
  STALE_AFTER_DAYS: 180,
  RECERTIFICATION_GRACE_DAYS: 14,
} as const;
