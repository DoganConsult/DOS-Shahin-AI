export const REMEDIATION_STATUSES = ['draft', 'in_progress', 'pending_verification', 'verified', 'failed', 'closed', 'archived'] as const;

export const REMEDIATION_DEFAULT_STATUS: typeof REMEDIATION_STATUSES[number] = 'draft';

export const REMEDIATION_TERMINAL_STATUSES = ['closed', 'archived'] as const;

export const REMEDIATION_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 30,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 50,
  MAX_LINKED_FINDINGS: 20,
  MAX_LINKED_CONTROLS: 10,
  MAX_MILESTONES: 20,
} as const;

export const REMEDIATION_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 168,
  ESCALATION_AFTER_HOURS: 48,
  REMINDER_BEFORE_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 730,
  SESSION_TIMEOUT_MINUTES: 30,
  OVERDUE_ESCALATION_HOURS: 24,
} as const;

export const REMEDIATION_SLA_DEFAULTS = {
  critical: 24,
  high: 72,
  medium: 168,
  low: 720,
} as const;

export const REMEDIATION_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 20,
} as const;

export const REMEDIATION_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 30,
  OVERDUE_WARNING_DAYS: 7,
} as const;

export const REMEDIATION_TYPES = ['technical', 'process', 'policy', 'training', 'compensating_control', 'risk_acceptance'] as const;

export const REMEDIATION_PRIORITIES = ['critical', 'high', 'medium', 'low'] as const;

export const REMEDIATION_VERIFICATION_METHODS = ['automated_scan', 'manual_test', 'evidence_review', 'third_party_audit', 'penetration_test'] as const;

export const REMEDIATION_SOURCE_TYPES = ['audit_finding', 'vulnerability', 'incident', 'risk', 'compliance_gap', 'self_identified'] as const;
