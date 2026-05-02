export const REMEDIATION_PLAN_STATES = [
  'draft', 'submitted', 'approved', 'in_progress', 'blocked',
  'escalated', 'pending_verification', 'verified', 'closed', 'archived',
] as const;

export type RemediationPlanState = (typeof REMEDIATION_PLAN_STATES)[number];

export const REMEDIATION_PLAN_TRANSITIONS: Record<RemediationPlanState, RemediationPlanState[]> = {
  draft: ['submitted'],
  submitted: ['approved', 'draft'],
  approved: ['in_progress'],
  in_progress: ['blocked', 'escalated', 'pending_verification'],
  blocked: ['in_progress', 'escalated'],
  escalated: ['in_progress', 'blocked'],
  pending_verification: ['verified', 'in_progress'],
  verified: ['closed'],
  closed: ['archived'],
  archived: [],
};

export const REMEDIATION_ACTION_STATES = [
  'pending', 'assigned', 'in_progress', 'overdue', 'completed', 'cancelled',
] as const;

export type RemediationActionState = (typeof REMEDIATION_ACTION_STATES)[number];

export const REMEDIATION_ACTION_TRANSITIONS: Record<RemediationActionState, RemediationActionState[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'overdue', 'cancelled'],
  overdue: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};
