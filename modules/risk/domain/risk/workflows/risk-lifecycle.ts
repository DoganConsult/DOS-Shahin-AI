export const RISK_STATES = [
  'draft', 'submitted', 'under_review', 'assessed', 'treatment_planned',
  'approved', 'active', 'monitoring', 'closed', 'retired', 'returned',
  'identified', 'mitigating', 'accepted', 'archived',
] as const;

export type RiskState = (typeof RISK_STATES)[number];

export const RISK_TRANSITIONS: Record<string, RiskState[]> = {
  draft:             ['submitted', 'identified'],
  submitted:         ['under_review'],
  under_review:      ['returned', 'assessed'],
  returned:          ['submitted'],
  assessed:          ['treatment_planned', 'active'],
  treatment_planned: ['approved'],
  approved:          ['active'],
  active:            ['monitoring', 'mitigating', 'assessed'],
  monitoring:        ['closed'],
  closed:            ['active', 'archived'],
  retired:           [],
  identified:        ['assessed'],
  mitigating:        ['accepted', 'active'],
  accepted:          ['closed'],
  archived:          [],
};

export const RISK_KRI_STATES = [
  'draft', 'active', 'breached', 'inactive', 'archived',
] as const;

export type RiskKriState = (typeof RISK_KRI_STATES)[number];

export const RISK_KRI_TRANSITIONS: Record<RiskKriState, RiskKriState[]> = {
  draft: ['active'],
  active: ['breached', 'inactive'],
  breached: ['active', 'inactive'],
  inactive: ['active', 'archived'],
  archived: [],
};

export const RISK_TREATMENT_STATES = [
  'draft', 'approved', 'in_progress', 'completed', 'overdue', 'cancelled',
] as const;

export type RiskTreatmentState = (typeof RISK_TREATMENT_STATES)[number];

export const RISK_TREATMENT_TRANSITIONS: Record<RiskTreatmentState, RiskTreatmentState[]> = {
  draft: ['approved', 'cancelled'],
  approved: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'overdue', 'cancelled'],
  overdue: ['in_progress', 'cancelled'],
  completed: [],
  cancelled: [],
};

export const RISK_ASSESSMENT_STATES = [
  'planned', 'in_progress', 'under_review', 'completed', 'cancelled',
] as const;

export type RiskAssessmentState = (typeof RISK_ASSESSMENT_STATES)[number];

export const RISK_ASSESSMENT_TRANSITIONS: Record<RiskAssessmentState, RiskAssessmentState[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['under_review', 'cancelled'],
  under_review: ['completed', 'in_progress'],
  completed: [],
  cancelled: [],
};
