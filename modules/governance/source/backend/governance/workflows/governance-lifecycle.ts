export const GOVERNANCE_BODY_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type GovernanceBodyState = (typeof GOVERNANCE_BODY_STATES)[number];

export const GOVERNANCE_BODY_TRANSITIONS: Record<GovernanceBodyState, GovernanceBodyState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const GOVERNANCE_DECISION_STATES = [
  'proposed', 'under_review', 'approved', 'rejected', 'deferred', 'archived',
] as const;

export type GovernanceDecisionState = (typeof GOVERNANCE_DECISION_STATES)[number];

export const GOVERNANCE_DECISION_TRANSITIONS: Record<GovernanceDecisionState, GovernanceDecisionState[]> = {
  proposed: ['under_review'],
  under_review: ['approved', 'rejected', 'deferred'],
  approved: ['archived'],
  rejected: ['proposed', 'archived'],
  deferred: ['proposed', 'archived'],
  archived: [],
};
