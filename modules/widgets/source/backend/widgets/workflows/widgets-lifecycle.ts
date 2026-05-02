export const WIDGETS_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type WidgetsState = (typeof WIDGETS_STATES)[number];

export const WIDGETS_TRANSITIONS: Record<WidgetsState, WidgetsState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};
