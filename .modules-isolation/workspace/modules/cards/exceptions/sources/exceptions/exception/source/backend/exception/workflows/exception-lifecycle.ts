export const EXCEPTION_STATES = [
  'draft', 'submitted', 'under_review', 'approved', 'rejected',
  'active', 'monitoring', 'expiring', 'expired', 'renewed', 'revoked', 'closed', 'archived',
] as const;

export type ExceptionState = (typeof EXCEPTION_STATES)[number];

export const EXCEPTION_TRANSITIONS: Record<ExceptionState, ExceptionState[]> = {
  draft: ['submitted', 'archived'],
  submitted: ['under_review', 'draft', 'archived'],
  under_review: ['approved', 'rejected', 'submitted', 'archived'],
  approved: ['active', 'revoked'],
  rejected: ['archived'],
  active: ['monitoring', 'expiring', 'revoked', 'closed'],
  monitoring: ['expiring', 'expired', 'closed'],
  expiring: ['active', 'expired', 'closed'],
  expired: ['renewed', 'closed', 'archived'],
  renewed: ['active'],
  revoked: ['archived'],
  closed: ['archived'],
  archived: [],
};

export const EXCEPTION_COMPENSATING_CONTROL_STATES = [
  'proposed', 'active', 'ineffective', 'removed',
] as const;

export type ExceptionCompensatingControlState = (typeof EXCEPTION_COMPENSATING_CONTROL_STATES)[number];

export const EXCEPTION_COMPENSATING_CONTROL_TRANSITIONS: Record<ExceptionCompensatingControlState, ExceptionCompensatingControlState[]> = {
  proposed: ['active', 'removed'],
  active: ['ineffective', 'removed'],
  ineffective: ['active', 'removed'],
  removed: [],
};
