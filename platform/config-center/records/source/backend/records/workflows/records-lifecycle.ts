export const RECORD_STATES = [
  'draft', 'active', 'under_review', 'retention_hold',
  'pending_disposal', 'disposed', 'archived',
] as const;

export type RecordState = (typeof RECORD_STATES)[number];

export const RECORD_TRANSITIONS: Record<RecordState, RecordState[]> = {
  draft: ['active'],
  active: ['under_review', 'retention_hold', 'pending_disposal'],
  under_review: ['active', 'retention_hold'],
  retention_hold: ['active', 'pending_disposal'],
  pending_disposal: ['disposed'],
  disposed: ['archived'],
  archived: [],
};
