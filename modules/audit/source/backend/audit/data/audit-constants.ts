export const AUDIT_STATUSES = ['planned', 'fieldwork', 'draft_report', 'review', 'final_report', 'closed', 'archived'] as const;

export const AUDIT_DEFAULT_STATUS: typeof AUDIT_STATUSES[number] = 'planned';

export const AUDIT_TERMINAL_STATUSES = ['closed', 'archived'] as const;

export const AUDIT_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 20000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 50,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 2000,
  MAX_COMMENT_LENGTH: 10000,
  MAX_LINKED_ENTITIES: 100,
  MAX_FINDINGS_PER_AUDIT: 200,
  MAX_TEAM_MEMBERS: 20,
} as const;

export const AUDIT_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 720,
  ESCALATION_AFTER_HOURS: 168,
  REMINDER_BEFORE_HOURS: 72,
  AUTO_ARCHIVE_AFTER_DAYS: 2555,
  SESSION_TIMEOUT_MINUTES: 30,
} as const;

export const AUDIT_SLA_DEFAULTS = {
  critical: 24,
  high: 72,
  medium: 168,
  low: 720,
} as const;

export const AUDIT_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 30,
} as const;

export const AUDIT_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 90,
} as const;

export const AUDIT_TYPES = ['internal', 'external', 'regulatory', 'follow_up', 'surprise', 'joint'] as const;

export const AUDIT_FINDING_SEVERITIES = ['critical', 'high', 'medium', 'low', 'informational'] as const;

// ── Finding Status Lifecycle (canonical) ──────────────────────────────
// All layers (routes, frontend, cross-hub, jobs) MUST use this set.
export const FINDING_STATUSES = [
  'open',                // Initial state
  'in_progress',         // Under remediation
  'remediation_planned', // Cross-hub auto-set when remediation task created
  'deferred',            // Temporarily deferred
  'resolved',            // Remediation complete, awaiting verification
  'verified',            // QA verified effective
  'closed',              // Final closure
] as const;

export type FindingStatus = typeof FINDING_STATUSES[number];
export const FINDING_DEFAULT_STATUS: FindingStatus = 'open';
export const FINDING_TERMINAL_STATUSES: readonly FindingStatus[] = ['closed'] as const;

export const FINDING_STATUS_TRANSITIONS: Record<FindingStatus, readonly FindingStatus[]> = {
  open:                 ['in_progress', 'remediation_planned', 'deferred', 'closed'],
  in_progress:          ['resolved', 'deferred', 'open'],
  remediation_planned:  ['in_progress', 'deferred'],
  deferred:             ['open', 'closed'],
  resolved:             ['verified', 'open'],
  verified:             ['closed'],
  closed:               [],
} as const;

export const AUDIT_FINDING_TYPES = ['control_deficiency', 'process_gap', 'policy_violation', 'regulatory_breach', 'best_practice_deviation'] as const;

export const AUDIT_SCOPES = ['organization', 'department', 'process', 'system', 'project', 'vendor'] as const;

export const AUDIT_OPINION_TYPES = ['unqualified', 'qualified', 'adverse', 'disclaimer'] as const;
