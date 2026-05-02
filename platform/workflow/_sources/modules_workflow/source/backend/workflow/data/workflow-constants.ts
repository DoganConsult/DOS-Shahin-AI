export const WORKFLOW_STATUSES = ['draft', 'active', 'paused', 'completed', 'cancelled', 'archived'] as const;

export const WORKFLOW_DEFAULT_STATUS: typeof WORKFLOW_STATUSES[number] = 'draft';

export const WORKFLOW_TERMINAL_STATUSES = ['completed', 'cancelled', 'archived'] as const;

export const WORKFLOW_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_NODES_PER_DEFINITION: 100,
  MAX_EDGES_PER_DEFINITION: 200,
  MAX_PARALLEL_BRANCHES: 10,
  MAX_ACTIVE_INSTANCES: 1000,
  MAX_EXPORT_ROWS: 5000,
  MAX_STEP_TIMEOUT_HOURS: 720,
} as const;

export const WORKFLOW_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 48,
  ESCALATION_AFTER_HOURS: 24,
  REMINDER_BEFORE_HOURS: 8,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
  STEP_DEFAULT_TIMEOUT_HOURS: 48,
} as const;

export const WORKFLOW_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 48,
  low: 168,
} as const;

export const WORKFLOW_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/json', 'application/pdf', 'text/csv'],
  MAX_FILE_SIZE_MB: 10,
  MAX_FILES_PER_ENTITY: 10,
} as const;

export const WORKFLOW_BUSINESS_THRESHOLDS = {
  SUCCESS_RATE_WARNING: 80,
  SUCCESS_RATE_CRITICAL: 60,
  MAX_INSTANCE_DURATION_DAYS: 90,
  STALE_AFTER_DAYS: 180,
} as const;
