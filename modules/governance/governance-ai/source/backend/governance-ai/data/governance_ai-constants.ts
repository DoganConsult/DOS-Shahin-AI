export const GOVERNANCE_AI_SIGNAL_STATUSES = ['detected', 'interpreting', 'interpreted', 'escalated', 'resolved', 'dismissed', 'archived'] as const;

export const GOVERNANCE_AI_DEFAULT_SIGNAL_STATUS: typeof GOVERNANCE_AI_SIGNAL_STATUSES[number] = 'detected';

export const GOVERNANCE_AI_TERMINAL_STATUSES = ['resolved', 'dismissed', 'archived'] as const;

export const GOVERNANCE_AI_SIGNAL_TYPES = ['anomaly', 'trend', 'threshold_breach', 'pattern', 'correlation', 'predictive'] as const;

export const GOVERNANCE_AI_DETECTION_METHODS = ['ml_model', 'rule_engine', 'statistical', 'hybrid'] as const;

export const GOVERNANCE_AI_SEVERITIES = ['critical', 'high', 'medium', 'low', 'informational'] as const;

export const GOVERNANCE_AI_NARRATIVE_TYPES = ['executive_summary', 'technical_detail', 'board_report', 'regulatory_notice'] as const;

export const GOVERNANCE_AI_TARGET_AUDIENCES = ['executive', 'board', 'operational', 'technical', 'regulatory'] as const;

export const GOVERNANCE_AI_MODEL_TYPES = ['anomaly_detection', 'trend_analysis', 'classification', 'prediction'] as const;

export const GOVERNANCE_AI_MODEL_STATUSES = ['training', 'testing', 'active', 'retired'] as const;

export const GOVERNANCE_AI_LIMITS = {
  MAX_SIGNALS_PER_QUERY: 500,
  MAX_INTERPRETATIONS_PER_SIGNAL: 5,
  MAX_NARRATIVES_PER_SIGNAL: 10,
  MAX_SUGGESTED_ACTIONS: 10,
  MAX_AFFECTED_DOMAINS: 20,
  MAX_MODELS_PER_TENANT: 50,
  MAX_DATA_SOURCE_MODULES: 15,
  MAX_NARRATIVE_LENGTH: 50000,
  MAX_INTERPRETATION_LENGTH: 10000,
} as const;

export const GOVERNANCE_AI_TIMEOUTS = {
  SIGNAL_STALE_HOURS: 72,
  INTERPRETATION_TIMEOUT_MS: 60000,
  MODEL_STALE_DAYS: 90,
  NARRATIVE_APPROVAL_SLA_HOURS: 24,
  SIGNAL_AUTO_DISMISS_DAYS: 30,
  MODEL_ACCURACY_CHECK_INTERVAL_HOURS: 24,
  AUTO_ARCHIVE_AFTER_DAYS: 180,
} as const;

export const GOVERNANCE_AI_THRESHOLDS = {
  MIN_CONFIDENCE_SCORE: 0.3,
  HIGH_CONFIDENCE_THRESHOLD: 0.8,
  MODEL_ACCURACY_WARNING: 0.7,
  MODEL_ACCURACY_CRITICAL: 0.5,
  FALSE_POSITIVE_RATE_WARNING: 0.3,
  FALSE_POSITIVE_RATE_CRITICAL: 0.5,
  ESCALATION_SEVERITY_THRESHOLD: 'high',
} as const;

export const GOVERNANCE_AI_BUSINESS_THRESHOLDS = {
  OVERDUE_WARNING_DAYS: 7,
  OVERDUE_CRITICAL_DAYS: 30,
  STALE_WARNING_DAYS: 60,
} as const;
