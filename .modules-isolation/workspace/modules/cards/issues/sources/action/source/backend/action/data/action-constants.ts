export const ACTION_STATUSES = ['open', 'in_progress', 'pending_review', 'completed', 'overdue', 'cancelled', 'archived'] as const;

export const ACTION_DEFAULT_STATUS: typeof ACTION_STATUSES[number] = 'open';

export const ACTION_TERMINAL_STATUSES = ['completed', 'cancelled', 'archived'] as const;

export const ACTION_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 20,
  MAX_BULK_OPERATION_SIZE: 200,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 50,
  MAX_SUBTASKS: 20,
  MAX_ASSIGNEES: 5,
  MAX_WATCHERS: 20,
} as const;

export const ACTION_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 168,
  ESCALATION_AFTER_HOURS: 48,
  REMINDER_BEFORE_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
  OVERDUE_CHECK_INTERVAL_HOURS: 1,
} as const;

export const ACTION_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const ACTION_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 10,
} as const;

export const ACTION_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 75,
  CRITICAL_PERCENTAGE: 90,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 14,
  OVERDUE_ESCALATION_HOURS: 24,
} as const;

export const ACTION_TYPES = ['task', 'corrective', 'preventive', 'improvement', 'follow_up', 'mitigation', 'compliance'] as const;

export const ACTION_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export const ACTION_SOURCE_TYPES = ['manual', 'audit_finding', 'risk', 'incident', 'compliance_gap', 'vulnerability', 'workflow'] as const;

export const ACTION_RECURRENCE_TYPES = ['none', 'daily', 'weekly', 'monthly', 'quarterly', 'annually'] as const;
