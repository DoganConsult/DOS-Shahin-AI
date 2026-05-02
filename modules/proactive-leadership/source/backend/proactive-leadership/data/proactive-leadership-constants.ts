export const INSIGHT_TYPES = ['risk_trend', 'compliance_drift', 'governance_gap', 'strategic_opportunity', 'anomaly'] as const;
export const ALERT_SEVERITIES = ['critical', 'high', 'medium', 'low'] as const;
export const BRIEF_PERIODS = ['daily', 'weekly', 'monthly'] as const;

export const LEADERSHIP_THRESHOLDS = {
  CRITICAL_RISK_COUNT_ALERT: 5,
  OVERDUE_OBLIGATION_ALERT: 10,
  COMPLIANCE_SCORE_DROP_PERCENT: 10,
  UNACKNOWLEDGED_ALERT_LIMIT: 20,
  INSIGHT_RETENTION_DAYS: 365,
} as const;
