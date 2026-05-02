export const POLICY_STATES = [
  'draft', 'submitted', 'under_review', 'revision_requested', 'resubmitted',
  'approved', 'published', 'active', 'review_due', 'under_revision', 'retired',
  'review', 'archived',
] as const;

export type PolicyState = (typeof POLICY_STATES)[number];

export const POLICY_TRANSITIONS: Record<string, PolicyState[]> = {
  draft:               ['submitted', 'review'],
  submitted:           ['under_review'],
  under_review:        ['revision_requested', 'approved'],
  revision_requested:  ['resubmitted'],
  resubmitted:         ['under_review'],
  review:              ['approved', 'draft'],
  approved:            ['published', 'draft'],
  published:           ['active', 'retired'],
  active:              ['review_due', 'retired'],
  review_due:          ['under_revision'],
  under_revision:      ['submitted', 'draft'],
  retired:             ['archived'],
  archived:            [],
};

export const POLICY_EXCEPTION_STATES = [
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'expired', 'revoked',
] as const;

export type PolicyExceptionState = (typeof POLICY_EXCEPTION_STATES)[number];

export const POLICY_EXCEPTION_TRANSITIONS: Record<PolicyExceptionState, PolicyExceptionState[]> = {
  draft: ['submitted'],
  submitted: ['under_review', 'rejected'],
  under_review: ['approved', 'rejected'],
  approved: ['expired', 'revoked'],
  rejected: [],
  expired: [],
  revoked: [],
};

export const POLICY_REVIEW_CYCLE_STATES = [
  'planned', 'in_progress', 'completed', 'overdue', 'cancelled',
] as const;

export type PolicyReviewCycleState = (typeof POLICY_REVIEW_CYCLE_STATES)[number];

export const POLICY_REVIEW_CYCLE_TRANSITIONS: Record<PolicyReviewCycleState, PolicyReviewCycleState[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'overdue', 'cancelled'],
  overdue: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const POLICY_ATTESTATION_STATES = [
  'pending', 'acknowledged', 'declined', 'expired',
] as const;

export type PolicyAttestationState = (typeof POLICY_ATTESTATION_STATES)[number];

export const POLICY_ATTESTATION_TRANSITIONS: Record<PolicyAttestationState, PolicyAttestationState[]> = {
  pending: ['acknowledged', 'declined', 'expired'],
  acknowledged: [],
  declined: [],
  expired: [],
};
