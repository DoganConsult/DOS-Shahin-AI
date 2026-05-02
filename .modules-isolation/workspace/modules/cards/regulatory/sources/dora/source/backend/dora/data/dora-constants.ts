export const DORA_STATUSES = ['draft', 'active', 'under_review', 'archived'] as const;
export const DORA_DEFAULT_STATUS = 'draft';

export const DORA_LIMITS = {
  maxIctAssets: 10000,
  maxResilienceTests: 5000,
  maxThreatIntel: 50000,
} as const;

export const DORA_TIMEOUTS = {
  incidentReportingHours: 4,
  resilienceTestMaxDays: 90,
} as const;

export const DORA_SLA_DEFAULTS = {
  incidentNotificationHours: 4,
  recoveryPlanReviewDays: 30,
  resilienceTestFrequencyDays: 365,
} as const;
