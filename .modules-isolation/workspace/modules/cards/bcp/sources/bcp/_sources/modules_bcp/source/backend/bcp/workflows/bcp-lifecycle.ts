export const BCP_PLAN_STATES = [
  'draft', 'in_review', 'approved', 'active', 'testing',
  'invoked', 'recovery_in_progress', 'recovered', 'post_incident_review',
  'suspended', 'archived',
] as const;

export type BcpPlanState = (typeof BCP_PLAN_STATES)[number];

export const BCP_PLAN_TRANSITIONS: Record<BcpPlanState, BcpPlanState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['testing', 'invoked', 'suspended', 'archived'],
  testing: ['active'],
  invoked: ['recovery_in_progress'],
  recovery_in_progress: ['recovered'],
  recovered: ['post_incident_review'],
  post_incident_review: ['active'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const BIA_STATES = [
  'draft', 'in_progress', 'under_review', 'approved', 'active', 'expired', 'archived',
] as const;

export type BiaState = (typeof BIA_STATES)[number];

export const BIA_TRANSITIONS: Record<BiaState, BiaState[]> = {
  draft: ['in_progress'],
  in_progress: ['under_review'],
  under_review: ['approved', 'in_progress'],
  approved: ['active'],
  active: ['expired', 'archived'],
  expired: ['in_progress', 'archived'],
  archived: [],
};
