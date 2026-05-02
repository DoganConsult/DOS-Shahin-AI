export const POLICY_STATUSES = [
  'draft', 'submitted', 'under_review', 'revision_requested', 'resubmitted',
  'approved', 'published', 'active', 'review_due', 'under_revision', 'retired',
  'review', 'in_review', 'effective', 'deprecated', 'archived',
] as const;

export const POLICY_DEFAULT_STATUS: typeof POLICY_STATUSES[number] = 'draft';

export const POLICY_TERMINAL_STATUSES = ['retired', 'deprecated', 'archived'] as const;

export const POLICY_ACTIVE_STATUSES = ['approved', 'published', 'effective', 'active'] as const;

export const POLICY_REVIEW_STATUSES = ['in_review', 'under_review', 'under_revision', 'review', 'review_due'] as const;

export const POLICY_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 50000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 20,
  MAX_BULK_OPERATION_SIZE: 50,
  MAX_EXPORT_ROWS: 5000,
  MAX_IMPORT_ROWS: 1000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 100,
  MAX_VERSION_HISTORY: 50,
  MAX_REVIEWERS: 10,
  MAX_APPROVERS: 5,
} as const;

export const POLICY_TIMEOUTS = {
  DEFAULT_REVIEW_CYCLE_DAYS: 365,
  ESCALATION_AFTER_DAYS: 14,
  REMINDER_BEFORE_DAYS: 30,
  AUTO_ARCHIVE_AFTER_DAYS: 1095,
  SESSION_TIMEOUT_MINUTES: 30,
  ACKNOWLEDGMENT_DEADLINE_DAYS: 30,
  OVERDUE_GRACE_DAYS: 7,
} as const;

export const POLICY_REVIEW_CYCLE_DEFAULTS: Record<string, number> = {
  information_security: 365,
  acceptable_use: 365,
  access_control: 365,
  data_classification: 365,
  incident_response: 180,
  bcp: 365,
  privacy: 365,
  hr: 730,
  finance: 365,
  operations: 365,
  technology: 365,
  compliance: 365,
  risk: 365,
  default: 365,
} as const;

export const POLICY_SLA_DEFAULTS = {
  critical: 24,
  high: 72,
  medium: 168,
  low: 720,
} as const;

export const POLICY_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'text/html', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  MAX_FILE_SIZE_MB: 25,
  MAX_FILES_PER_ENTITY: 10,
} as const;

export const POLICY_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 60,
  LOW_COMPLIANCE_RATE: 70,
  CRITICAL_COMPLIANCE_RATE: 50,
  OVERDUE_REVIEW_WARNING: 5,
  OVERDUE_REVIEW_CRITICAL: 20,
} as const;

export const POLICY_TYPES = ['policy', 'standard', 'procedure', 'guideline', 'baseline', 'charter', 'framework'] as const;

export const POLICY_REVIEW_CYCLE_DAYS = 365 as const;

export const POLICY_CATEGORIES = ['information_security', 'acceptable_use', 'access_control', 'data_classification', 'incident_response', 'bcp', 'privacy', 'hr', 'finance', 'operations', 'technology', 'compliance', 'risk'] as const;

export const POLICY_APPROVAL_LEVELS = ['manager', 'director', 'vp', 'ciso', 'board'] as const;

export const POLICY_AUDIENCE_TYPES = ['all_staff', 'management', 'it', 'finance', 'legal', 'specific_role'] as const;

export const POLICY_FRAMEWORKS = ['NCA-ECC', 'NCA-CSCC', 'ISO-27001', 'ISO-27701', 'NIST-CSF', 'NIST-800-53', 'SAMA-CSF', 'PCI-DSS', 'GDPR', 'PDPL', 'COBIT', 'ITIL'] as const;

export const POLICY_ACKNOWLEDGMENT_TYPES = ['read_and_understood', 'training_completed', 'attestation', 'e_signature', 'manager_confirmed'] as const;

export const POLICY_EXCEPTION_STATUSES = ['requested', 'under_review', 'approved', 'rejected', 'expired'] as const;

export const POLICY_VERSION_CHANGE_TYPES = ['major', 'minor', 'patch', 'editorial'] as const;
