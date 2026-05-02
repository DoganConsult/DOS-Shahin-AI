export const AGRCENGINE_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type AgrcEngineState = (typeof AGRCENGINE_STATES)[number];

export const AGRCENGINE_TRANSITIONS: Record<AgrcEngineState, AgrcEngineState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};
