export const CONTROLS_STATUSES = ['draft', 'active', 'under_review', 'ineffective', 'retired', 'archived'] as const;

export const CONTROLS_DEFAULT_STATUS: typeof CONTROLS_STATUSES[number] = 'draft';

export const CONTROLS_TERMINAL_STATUSES = ['retired', 'archived'] as const;

export const CONTROLS_TYPES = ['preventive', 'detective', 'corrective', 'directive', 'compensating'] as const;

export const CONTROLS_IMPLEMENTATION_TYPES = ['manual', 'automated', 'hybrid'] as const;

export const CONTROLS_FREQUENCIES = ['continuous', 'daily', 'weekly', 'monthly', 'quarterly', 'annually', 'event_driven'] as const;

export const CONTROLS_EFFECTIVENESS_RATINGS = ['effective', 'partially_effective', 'ineffective', 'not_assessed'] as const;

export const CONTROLS_TEST_TYPES = ['design', 'operating', 'walkthrough', 'substantive'] as const;

export const CONTROLS_AUTOMATION_HEALTH = ['healthy', 'degraded', 'failing', 'unknown'] as const;

export const CONTROLS_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_LINKED_RISKS: 50,
  MAX_LINKED_OBLIGATIONS: 100,
  MAX_LINKED_POLICIES: 50,
  MAX_LINKED_ASSETS: 100,
  MAX_MONITORING_RULES: 20,
} as const;

export const CONTROLS_TIMEOUTS = {
  DEFAULT_TEST_DUE_DAYS: 90,
  TEST_OVERDUE_GRACE_DAYS: 7,
  REVIEW_TIMEOUT_DAYS: 7,
  CERTIFICATION_VALIDITY_DAYS: 365,
  AUTOMATION_STALE_THRESHOLD_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 730,
} as const;

export const CONTROLS_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const CONTROLS_BUSINESS_THRESHOLDS = {
  INEFFECTIVE_CONTROL_CRITICAL_THRESHOLD: 5,
  OVERDUE_TEST_WARNING_PERCENTAGE: 10,
  UNMAPPED_CONTROL_WARNING_THRESHOLD: 3,
  AUTOMATION_FAILURE_ESCALATION_COUNT: 3,
  MINIMUM_TEST_SAMPLE_SIZE: 25,
  STALE_AFTER_DAYS: 90,
} as const;
