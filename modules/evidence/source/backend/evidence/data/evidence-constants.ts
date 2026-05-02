export const EVIDENCE_STATUSES = [
  'requested', 'collecting', 'uploaded', 'under_review', 'verified',
  'locked', 'released', 'archived', 'rejected_quality',
  'pending', 'collected', 'reviewed', 'accepted', 'rejected', 'expired',
] as const;

export const EVIDENCE_DEFAULT_STATUS: typeof EVIDENCE_STATUSES[number] = 'requested';

export const EVIDENCE_TERMINAL_STATUSES = ['archived'] as const;

export const EVIDENCE_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 10,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 2000,
  MAX_LINKED_ENTITIES: 50,
  MAX_LINKED_CONTROLS: 20,
} as const;

export const EVIDENCE_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 48,
  ESCALATION_AFTER_HOURS: 24,
  REMINDER_BEFORE_HOURS: 8,
  AUTO_ARCHIVE_AFTER_DAYS: 365,
  SESSION_TIMEOUT_MINUTES: 30,
} as const;

export const EVIDENCE_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const EVIDENCE_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/zip', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/json', 'text/plain'],
  MAX_FILE_SIZE_MB: 100,
  MAX_FILES_PER_ENTITY: 20,
  ALLOWED_EXTENSIONS: ['pdf', 'docx', 'xlsx', 'png', 'jpg', 'jpeg', 'csv', 'zip', 'json', 'txt'],
} as const;

export const EVIDENCE_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 30,
} as const;

export const EVIDENCE_VALIDITY_DEFAULT_DAYS = 365 as const;

export const EVIDENCE_TYPES = ['document', 'screenshot', 'log_export', 'system_output', 'config_snapshot', 'attestation', 'certificate', 'report', 'interview_notes'] as const;

export const EVIDENCE_COLLECTION_METHODS = ['manual', 'automated', 'api_pull', 'agent', 'upload'] as const;

export const EVIDENCE_QUALITY_SCORES = ['insufficient', 'partial', 'adequate', 'strong', 'conclusive'] as const;
