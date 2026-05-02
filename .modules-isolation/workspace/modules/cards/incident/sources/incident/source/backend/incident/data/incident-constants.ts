export const INCIDENT_STATUSES = ['detected', 'triaged', 'contained', 'investigating', 'remediated', 'resolved', 'closed', 'archived'] as const;

export const INCIDENT_DEFAULT_STATUS: typeof INCIDENT_STATUSES[number] = 'detected';

export const INCIDENT_TERMINAL_STATUSES = ['closed', 'archived'] as const;

export const INCIDENT_LIMITS = {
  MAX_TITLE_LENGTH: 500,
  MAX_DESCRIPTION_LENGTH: 20000,
  MAX_TAGS: 30,
  MAX_ATTACHMENTS: 50,
  MAX_BULK_OPERATION_SIZE: 100,
  MAX_EXPORT_ROWS: 10000,
  MAX_IMPORT_ROWS: 5000,
  MAX_COMMENT_LENGTH: 10000,
  MAX_LINKED_ENTITIES: 100,
  MAX_AFFECTED_SYSTEMS: 50,
  MAX_RESPONDERS: 20,
} as const;

export const INCIDENT_TIMEOUTS = {
  DEFAULT_SLA_HOURS: 4,
  ESCALATION_AFTER_HOURS: 1,
  REMINDER_BEFORE_HOURS: 0.5,
  AUTO_ARCHIVE_AFTER_DAYS: 730,
  SESSION_TIMEOUT_MINUTES: 30,
} as const;

export const INCIDENT_SLA_DEFAULTS = {
  critical: 1,
  high: 4,
  medium: 24,
  low: 72,
} as const;

export const INCIDENT_FILE_RULES = {
  ALLOWED_MIME_TYPES: ['application/pdf', 'image/png', 'image/jpeg', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'text/plain', 'application/json'],
  MAX_FILE_SIZE_MB: 50,
  MAX_FILES_PER_ENTITY: 30,
} as const;

export const INCIDENT_BUSINESS_THRESHOLDS = {
  WARNING_PERCENTAGE: 70,
  CRITICAL_PERCENTAGE: 90,
  MIN_COMPLETION_FOR_CLOSE: 100,
  STALE_AFTER_DAYS: 7,
} as const;

export const INCIDENT_TYPES = ['security_breach', 'data_leak', 'system_outage', 'policy_violation', 'physical', 'natural_disaster', 'ransomware', 'phishing', 'insider_threat', 'ddos', 'unauthorized_access'] as const;

export const INCIDENT_SEVERITY_LEVELS = ['critical', 'high', 'medium', 'low'] as const;

export const INCIDENT_IMPACT_AREAS = ['confidentiality', 'integrity', 'availability', 'financial', 'reputational', 'legal', 'operational'] as const;

export const INCIDENT_RESPONSE_PHASES = ['preparation', 'identification', 'containment', 'eradication', 'recovery', 'lessons_learned'] as const;

export const INCIDENT_NOTIFICATION_REQUIREMENTS = ['internal', 'regulatory', 'law_enforcement', 'public', 'affected_parties'] as const;
