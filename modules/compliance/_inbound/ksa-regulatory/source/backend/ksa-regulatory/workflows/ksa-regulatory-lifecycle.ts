export const KSAREGULATORY_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type KsaRegulatoryState = (typeof KSAREGULATORY_STATES)[number];

export const KSAREGULATORY_TRANSITIONS: Record<KsaRegulatoryState, KsaRegulatoryState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};
