export const QIYAS_ASSESSMENT_STATES = [
  'draft', 'data_collection', 'scoring', 'under_review',
  'approved', 'published', 'expired', 'archived',
] as const;

export type QiyasAssessmentState = (typeof QIYAS_ASSESSMENT_STATES)[number];

export const QIYAS_ASSESSMENT_TRANSITIONS: Record<QiyasAssessmentState, QiyasAssessmentState[]> = {
  draft: ['data_collection'],
  data_collection: ['scoring'],
  scoring: ['under_review'],
  under_review: ['approved', 'scoring'],
  approved: ['published'],
  published: ['expired', 'archived'],
  expired: ['data_collection', 'archived'],
  archived: [],
};
