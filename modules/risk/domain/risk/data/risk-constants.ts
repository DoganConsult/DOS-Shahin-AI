export const RISK_STATUSES = [
  'draft', 'submitted', 'under_review', 'assessed', 'treatment_planned',
  'approved', 'active', 'monitoring', 'closed', 'retired', 'returned',
  'identified', 'mitigating', 'accepted', 'archived',
] as const;

export const RISK_DEFAULT_STATUS: typeof RISK_STATUSES[number] = 'draft';

export const RISK_TERMINAL_STATUSES = ['closed', 'retired'] as const;

export const RISK_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 100,
  MAX_LINKED_CONTROLS: 50,
} as const;

export const RISK_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 24,
  ESCALATION_AFTER_HOURS: 8,
  REMINDER_BEFORE_HOURS: 4,
  AUTO_ARCHIVE_AFTER_DAYS: 730,
  SESSION_TIMEOUT_MINUTES: 30,
} as const;

export const RISK_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const RISK_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const RISK_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 30,
} as const;

export const RISK_MATRIX_SIZE = 5 as const;

export const RISK_SCORE_RANGE = { MIN: 1, MAX: 25 } as const;

export const RISK_CATEGORIES = ['operational', 'financial', 'strategic', 'compliance', 'reputational', 'technology', 'third_party'] as const;

export const RISK_LIKELIHOOD_LEVELS = [1, 2, 3, 4, 5] as const;

export const RISK_IMPACT_LEVELS = [1, 2, 3, 4, 5] as const;

export const RISK_APPETITE_LEVELS = ['very_low', 'low', 'medium', 'high', 'very_high'] as const;

export const RISK_TREATMENT_OPTIONS = ['accept', 'mitigate', 'transfer', 'avoid'] as const;
