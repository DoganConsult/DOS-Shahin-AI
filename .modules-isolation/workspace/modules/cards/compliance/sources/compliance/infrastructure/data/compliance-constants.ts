export const COMPLIANCE_STATUSES = ['draft', 'mapped', 'assessed', 'compliant', 'non_compliant', 'remediation', 'closed', 'archived'] as const;

export const COMPLIANCE_DEFAULT_STATUS: typeof COMPLIANCE_STATUSES[number] = 'draft';

export const COMPLIANCE_TERMINAL_STATUSES = ['closed', 'archived'] as const;

export const COMPLIANCE_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 30,
  MAX_ATTACHMENTS: 100,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 100,
  MAX_CONTROLS_PER_FRAMEWORK: 500,
} as const;

export const COMPLIANCE_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 720,
  ESCALATION_AFTER_HOURS: 168,
  REMINDER_BEFORE_HOURS: 48,
  AUTO_ARCHIVE_AFTER_DAYS: 1095,
  SESSION_TIMEOUT_MINUTES: 30,
  DEFAULT_ASSESSMENT_CYCLE_DAYS: 365,
  STALE_REMEDIATION_AFTER_DAYS: 90,
  CERTIFICATION_EXPIRY_WARNING_DAYS: 30,
  REGULATORY_CHANGE_IMPACT_SLA_DAYS: 30,
} as const;

export const COMPLIANCE_SLA_DEFAULTS = {
  critical: 8,
  high: 48,
  medium: 168,
  low: 720,
} as const;

export const COMPLIANCE_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 30,
} as const;

export const COMPLIANCE_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 85,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 90,
} as const;

export const COMPLIANCE_FRAMEWORK_TYPES = ['nca_ecc', 'iso27001', 'nist_csf', 'pci_dss', 'soc2', 'gdpr', 'pdpl', 'isa_ccc', 'sama_csfp', 'nca_otcc', 'iso27701', 'cobit'] as const;

export const COMPLIANCE_ASSESSMENT_TYPES = ['self_assessment', 'internal_audit', 'external_audit', 'regulatory', 'third_party'] as const;

export const COMPLIANCE_GAP_SEVERITIES = ['critical', 'major', 'minor', 'observation'] as const;

export const COMPLIANCE_CONTROL_MATURITY = ['initial', 'developing', 'defined', 'managed', 'optimized'] as const;
