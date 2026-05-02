export const INSIGHT_TYPE_ENUM = {
  RISK_TREND: 'risk_trend',
  COMPLIANCE_DRIFT: 'compliance_drift',
  GOVERNANCE_GAP: 'governance_gap',
  STRATEGIC_OPPORTUNITY: 'strategic_opportunity',
  ANOMALY: 'anomaly',
} as const;

export const BRIEF_PERIOD_ENUM = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
} as const;

export const TREND_DIRECTION = {
  IMPROVING: 'improving',
  STABLE: 'stable',
  DETERIORATING: 'deteriorating',
} as const;
