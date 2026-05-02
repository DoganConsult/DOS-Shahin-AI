export const COMPLIANCE_FRAMEWORK_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type ComplianceFrameworkState = (typeof COMPLIANCE_FRAMEWORK_STATES)[number];

export const COMPLIANCE_FRAMEWORK_TRANSITIONS: Record<ComplianceFrameworkState, ComplianceFrameworkState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

export const COMPLIANCE_ASSESSMENT_STATES = [
  'planned', 'in_progress', 'under_review', 'completed', 'cancelled',
] as const;

export type ComplianceAssessmentState = (typeof COMPLIANCE_ASSESSMENT_STATES)[number];

export const COMPLIANCE_ASSESSMENT_TRANSITIONS: Record<ComplianceAssessmentState, ComplianceAssessmentState[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['under_review', 'cancelled'],
  under_review: ['completed', 'in_progress'],
  completed: [],
  cancelled: [],
};

export const COMPLIANCE_OBLIGATION_STATES = [
  'draft', 'active', 'non_compliant', 'compliant', 'waived', 'archived',
] as const;

export type ComplianceObligationState = (typeof COMPLIANCE_OBLIGATION_STATES)[number];

export const COMPLIANCE_OBLIGATION_TRANSITIONS: Record<ComplianceObligationState, ComplianceObligationState[]> = {
  draft: ['active'],
  active: ['compliant', 'non_compliant', 'waived', 'archived'],
  non_compliant: ['active', 'compliant', 'waived'],
  compliant: ['active', 'non_compliant'],
  waived: ['active', 'archived'],
  archived: [],
};
