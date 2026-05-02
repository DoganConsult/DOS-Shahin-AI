import type { KsaObligationStatus } from '../contracts/ksa-regulatory.contracts';

export const KSA_OBLIGATION_STATES: readonly KsaObligationStatus[] = [
  'identified', 'mapped', 'under_review', 'compliant', 'non_compliant', 'remediation', 'archived',
] as const;

export const KSA_OBLIGATION_TRANSITIONS: Record<KsaObligationStatus, KsaObligationStatus[]> = {
  identified: ['mapped', 'archived'],
  mapped: ['under_review', 'identified', 'archived'],
  under_review: ['compliant', 'non_compliant', 'mapped'],
  compliant: ['under_review', 'non_compliant', 'archived'],
  non_compliant: ['remediation', 'under_review'],
  remediation: ['under_review', 'compliant'],
  archived: [],
};

export const KSA_TERMINAL_STATES: readonly KsaObligationStatus[] = ['archived'];

export function isValidKsaObligationTransition(from: KsaObligationStatus, to: KsaObligationStatus): boolean {
  return KSA_OBLIGATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isKsaObligationTerminal(state: KsaObligationStatus): boolean {
  return KSA_TERMINAL_STATES.includes(state);
}
