export const PACK_STATES = [
  'draft', 'assembling', 'in_review', 'approved', 'published',
  'distributed', 'expired', 'archived',
] as const;

export type PackState = (typeof PACK_STATES)[number];

export const PACK_TRANSITIONS: Record<PackState, PackState[]> = {
  draft: ['assembling'],
  assembling: ['in_review'],
  in_review: ['approved', 'assembling'],
  approved: ['published'],
  published: ['distributed', 'expired'],
  distributed: ['expired', 'archived'],
  expired: ['archived'],
  archived: [],
};
