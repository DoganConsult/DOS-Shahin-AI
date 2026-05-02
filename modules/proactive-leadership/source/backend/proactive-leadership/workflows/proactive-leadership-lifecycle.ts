export const PROACTIVELEADERSHIP_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type ProactiveLeadershipState = (typeof PROACTIVELEADERSHIP_STATES)[number];

export const PROACTIVELEADERSHIP_TRANSITIONS: Record<ProactiveLeadershipState, ProactiveLeadershipState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};
