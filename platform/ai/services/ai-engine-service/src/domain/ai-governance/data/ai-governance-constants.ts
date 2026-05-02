export const AI_GOVERNANCE_STATUSES = ['draft', 'assessment', 'review', 'approved', 'monitoring', 'non_compliant', 'retired', 'archived'] as const;

export const AI_GOVERNANCE_DEFAULT_STATUS: typeof AI_GOVERNANCE_STATUSES[number] = 'draft';

export const AI_GOVERNANCE_TERMINAL_STATUSES = ['retired', 'archived'] as const;

export const AI_GOVERNANCE_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 50,
  MAX_EXPORT_ROWS: 5000,
  MAX_DATA_SOURCES: 50,
  MAX_MODEL_VERSIONS: 100,
  MAX_BIAS_METRICS: 30,
  MAX_STAKEHOLDERS: 20,
} as const;

export const AI_GOVERNANCE_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 168,
  ESCALATION_AFTER_HOURS: 48,
  REMINDER_BEFORE_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
  AUDIT_INTERVAL_DAYS: 90,
  IMPACT_ASSESSMENT_INTERVAL_DAYS: 180,
} as const;

export const AI_GOVERNANCE_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const AI_GOVERNANCE_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'application/json', 'text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/png'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 30,
} as const;

export const AI_GOVERNANCE_BUSINESS_THRESHOLDS = {
  FAIRNESS_THRESHOLD: 0.8,
  TRANSPARENCY_MIN_SCORE: 0.6,
  BIAS_ALERT_THRESHOLD: 0.15,
  DRIFT_ALERT_THRESHOLD: 0.10,
  MAX_AUTONOMY_LEVEL: 5,
  STALE_AFTER_DAYS: 90,
} as const;
