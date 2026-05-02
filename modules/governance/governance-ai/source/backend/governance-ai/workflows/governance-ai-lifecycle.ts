export const GOVERNANCEAI_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type GovernanceAiState = (typeof GOVERNANCEAI_STATES)[number];

export const GOVERNANCEAI_TRANSITIONS: Record<GovernanceAiState, GovernanceAiState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};
