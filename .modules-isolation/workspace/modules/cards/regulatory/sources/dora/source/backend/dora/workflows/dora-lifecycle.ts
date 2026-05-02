export const DORA_ASSESSMENT_STATES = [
  'draft', 'in_progress', 'under_review', 'approved', 'submitted_to_regulator',
  'active', 'expired', 'archived',
] as const;

export type DoraAssessmentState = (typeof DORA_ASSESSMENT_STATES)[number];

export const DORA_ASSESSMENT_TRANSITIONS: Record<DoraAssessmentState, DoraAssessmentState[]> = {
  draft: ['in_progress'],
  in_progress: ['under_review'],
  under_review: ['approved', 'in_progress'],
  approved: ['submitted_to_regulator', 'active'],
  submitted_to_regulator: ['active'],
  active: ['expired', 'archived'],
  expired: ['in_progress', 'archived'],
  archived: [],
};

export const DORA_ICT_RISK_STATES = [
  'identified', 'assessed', 'mitigating', 'accepted', 'closed',
] as const;

export type DoraIctRiskState = (typeof DORA_ICT_RISK_STATES)[number];

export const DORA_ICT_RISK_TRANSITIONS: Record<DoraIctRiskState, DoraIctRiskState[]> = {
  identified: ['assessed'],
  assessed: ['mitigating', 'accepted'],
  mitigating: ['accepted', 'assessed'],
  accepted: ['closed'],
  closed: [],
};
