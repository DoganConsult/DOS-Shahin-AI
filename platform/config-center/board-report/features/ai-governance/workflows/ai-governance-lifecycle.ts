export const AI_MODEL_GOVERNANCE_STATES = [
  'draft', 'in_review', 'approved', 'deployed', 'monitoring', 'suspended', 'retired', 'archived',
] as const;

export type AiModelGovernanceState = (typeof AI_MODEL_GOVERNANCE_STATES)[number];

export const AI_RISK_ASSESSMENT_STATES = [
  'planned', 'in_progress', 'under_review', 'completed', 'cancelled',
] as const;

export type AiRiskAssessmentState = (typeof AI_RISK_ASSESSMENT_STATES)[number];
