export const PORTAL_STATES = [
  'draft', 'configured', 'in_review', 'published', 'suspended', 'archived',
] as const;

export type PortalState = (typeof PORTAL_STATES)[number];

export const PORTAL_TRANSITIONS: Record<PortalState, PortalState[]> = {
  draft: ['configured'],
  configured: ['in_review'],
  in_review: ['published', 'configured'],
  published: ['suspended', 'archived'],
  suspended: ['published', 'archived'],
  archived: [],
};
