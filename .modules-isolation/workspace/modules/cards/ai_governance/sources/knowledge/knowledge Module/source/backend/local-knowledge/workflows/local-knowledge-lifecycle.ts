export const LOCALKNOWLEDGE_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type LocalKnowledgeState = (typeof LOCALKNOWLEDGE_STATES)[number];

export const LOCALKNOWLEDGE_TRANSITIONS: Record<LocalKnowledgeState, LocalKnowledgeState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};
