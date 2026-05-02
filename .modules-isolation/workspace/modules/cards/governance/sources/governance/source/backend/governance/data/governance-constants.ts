export const GOVERNANCE_STATUSES = ['draft', 'proposed', 'approved', 'active', 'review', 'retired', 'archived'] as const;

export const GOVERNANCE_DEFAULT_STATUS: typeof GOVERNANCE_STATUSES[number] = 'draft';

export const GOVERNANCE_TERMINAL_STATUSES = ['retired', 'archived'] as const;

export const GOVERNANCE_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 20000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 30,
  MAX_BULK_OPERATION_SIZE: 50,
  MAX_EXPORT_ROWS: 5000,
  MAX_IMPORT_ROWS: 1000,
  MAX_COMMENT_LENGTH: 10000,
  MAX_LINKED_ENTITIES: 100,
  MAX_COMMITTEE_MEMBERS: 30,
  MAX_AGENDA_ITEMS: 50,
  MAX_RESOLUTIONS_PER_MEETING: 30,
} as const;

export const GOVERNANCE_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 720,
  ESCALATION_AFTER_HOURS: 168,
  REMINDER_BEFORE_HOURS: 48,
  AUTO_ARCHIVE_AFTER_DAYS: 1825,
  SESSION_TIMEOUT_MINUTES: 30,
  MEETING_MINUTES_DUE_HOURS: 72,
} as const;

export const GOVERNANCE_SLA_DEFAULTS = {
  critical: 48,
  high: 168,
  medium: 720,
  low: 2160,
} as const;

export const GOVERNANCE_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const GOVERNANCE_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 180,
  QUORUM_PERCENTAGE: 51,
} as const;

export const GOVERNANCE_BODY_TYPES = ['board', 'committee', 'working_group', 'steering_committee', 'council', 'task_force', 'advisory_panel'] as const;

export const GOVERNANCE_MEETING_FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'ad_hoc'] as const;

export const GOVERNANCE_DECISION_TYPES = ['resolution', 'recommendation', 'direction', 'approval', 'ratification', 'deferral'] as const;

export const GOVERNANCE_CHARTER_ELEMENTS = ['mandate', 'membership', 'quorum', 'voting', 'reporting', 'scope', 'term'] as const;
