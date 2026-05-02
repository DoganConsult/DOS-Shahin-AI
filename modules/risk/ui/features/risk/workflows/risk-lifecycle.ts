import { RiskStatus } from '../contracts/risk.contracts';

export const RISK_STATES: readonly RiskStatus[] = [
  'draft', 'submitted', 'under_review', 'assessed', 'treatment_planned',
  'approved', 'active', 'monitoring', 'closed', 'retired', 'returned',
  'identified', 'mitigating', 'accepted', 'archived',
] as const;

export const RISK_TRANSITIONS: Record<RiskStatus, RiskStatus[]> = {
  draft: ['submitted', 'identified'],
  submitted: ['under_review'],
  under_review: ['returned', 'assessed'],
  returned: ['submitted'],
  assessed: ['treatment_planned', 'active'],
  treatment_planned: ['approved'],
  approved: ['active'],
  active: ['monitoring', 'mitigating', 'assessed'],
  monitoring: ['closed'],
  closed: ['active', 'archived'],
  retired: [],
  identified: ['assessed'],
  mitigating: ['accepted', 'active'],
  accepted: ['closed'],
  archived: [],
};

export const RISK_TERMINAL_STATES: readonly RiskStatus[] = ['closed', 'retired', 'archived'];

export function isValidRiskTransition(from: RiskStatus, to: RiskStatus): boolean {
  return RISK_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isRiskTerminal(state: RiskStatus): boolean {
  return RISK_TERMINAL_STATES.includes(state);
}
