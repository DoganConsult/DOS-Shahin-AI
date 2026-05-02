export const COMPLIANCE_FRAMEWORK_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
] as const;

export type ComplianceFrameworkState = (typeof COMPLIANCE_FRAMEWORK_STATES)[number];

export const COMPLIANCE_ASSESSMENT_STATES = [
  'planned', 'in_progress', 'under_review', 'completed', 'cancelled',
] as const;

export type ComplianceAssessmentState = (typeof COMPLIANCE_ASSESSMENT_STATES)[number];

export const COMPLIANCE_OBLIGATION_STATES = [
  'draft', 'active', 'non_compliant', 'compliant', 'waived', 'archived',
] as const;

export type ComplianceObligationState = (typeof COMPLIANCE_OBLIGATION_STATES)[number];
