export const GOVERNANCE_BODY_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type GovernanceBodyState = (typeof GOVERNANCE_BODY_STATES)[number];

export const GOVERNANCE_DECISION_STATES = [
  'proposed', 'under_review', 'approved', 'rejected', 'deferred', 'archived',
] as const;

export type GovernanceDecisionState = (typeof GOVERNANCE_DECISION_STATES)[number];
