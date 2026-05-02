export const DPIA_STATES = [
  'draft', 'screening', 'assessment_in_progress', 'under_review',
  'approved', 'active', 'monitoring', 'review_due', 'archived',
] as const;

export type DpiaState = (typeof DPIA_STATES)[number];

export const DPIA_TRANSITIONS: Record<DpiaState, DpiaState[]> = {
  draft: ['screening'],
  screening: ['assessment_in_progress', 'archived'],
  assessment_in_progress: ['under_review'],
  under_review: ['approved', 'assessment_in_progress'],
  approved: ['active'],
  active: ['monitoring', 'review_due', 'archived'],
  monitoring: ['review_due', 'archived'],
  review_due: ['assessment_in_progress', 'archived'],
  archived: [],
};

export const PRIVACY_RECORD_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type PrivacyRecordState = (typeof PRIVACY_RECORD_STATES)[number];

export const PRIVACY_RECORD_TRANSITIONS: Record<PrivacyRecordState, PrivacyRecordState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};
