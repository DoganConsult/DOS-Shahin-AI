export const EVIDENCE_ITEM_STATES = [
  'draft', 'collected', 'under_review', 'approved', 'expired', 'archived',
] as const;

export type EvidenceItemState = (typeof EVIDENCE_ITEM_STATES)[number];

export const EVIDENCE_ITEM_TRANSITIONS: Record<EvidenceItemState, EvidenceItemState[]> = {
  draft: ['collected'],
  collected: ['under_review', 'expired'],
  under_review: ['approved', 'collected'],
  approved: ['expired', 'archived'],
  expired: ['collected', 'archived'],
  archived: [],
};

export const EVIDENCE_COLLECTION_STATES = [
  'planned', 'in_progress', 'completed', 'failed', 'cancelled',
] as const;

export type EvidenceCollectionState = (typeof EVIDENCE_COLLECTION_STATES)[number];

export const EVIDENCE_COLLECTION_TRANSITIONS: Record<EvidenceCollectionState, EvidenceCollectionState[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'failed', 'cancelled'],
  completed: [],
  failed: ['planned'],
  cancelled: [],
};
