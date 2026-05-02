export const VENDOR_STATUSES = ['prospect', 'onboarding', 'active', 'under_review', 'suspended', 'offboarding', 'terminated', 'archived'] as const;

export const VENDOR_DEFAULT_STATUS: typeof VENDOR_STATUSES[number] = 'prospect';

export const VENDOR_TERMINAL_STATUSES = ['terminated', 'archived'] as const;

export const VENDOR_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 10000,
  MAX_TAGS: 20,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 5000,
  MAX_LINKED_ENTITIES: 100,
  MAX_CONTACTS_PER_VENDOR: 20,
  MAX_CONTRACTS_PER_VENDOR: 10,
  MAX_QUESTIONNAIRE_ITEMS: 200,
} as const;

export const VENDOR_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 168,
  ESCALATION_AFTER_HOURS: 72,
  REMINDER_BEFORE_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 730,
  SESSION_TIMEOUT_MINUTES: 30,
  CONTRACT_EXPIRY_REMINDER_DAYS: 90,
} as const;

export const VENDOR_SLA_DEFAULTS = {
  critical: 4,
  high: 24,
  medium: 72,
  low: 168,
} as const;

export const VENDOR_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 30,
} as const;

export const VENDOR_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 80,
  CRITICAL_PERCENTAGE: 95,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 180,
} as const;

export const VENDOR_RISK_TIERS = ['critical', 'high', 'medium', 'low'] as const;

export const VENDOR_DUE_DILIGENCE_TYPES = ['initial', 'annual', 'event_triggered', 'enhanced', 'simplified'] as const;

export const VENDOR_CATEGORIES = ['technology', 'cloud', 'professional_services', 'data_processing', 'infrastructure', 'logistics', 'financial', 'legal', 'marketing'] as const;

export const VENDOR_CONTRACT_TYPES = ['msa', 'sow', 'nda', 'dpa', 'sla', 'amendment'] as const;

export const VENDOR_ASSESSMENT_DOMAINS = ['information_security', 'data_privacy', 'business_continuity', 'financial_stability', 'compliance', 'esg', 'operational_resilience'] as const;
