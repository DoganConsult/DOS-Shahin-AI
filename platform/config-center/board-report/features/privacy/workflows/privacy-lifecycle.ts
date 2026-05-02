import type { PrivacyStatus } from '../contracts/privacy.contracts';
export const PRIVACY_STATES: readonly PrivacyStatus[] = ['draft', 'under_review', 'active', 'non_compliant', 'remediation', 'archived'] as const;
export const PRIVACY_TRANSITIONS: Record<PrivacyStatus, PrivacyStatus[]> = {
  draft: ['under_review', 'archived'], under_review: ['active', 'draft'], active: ['non_compliant', 'under_review', 'archived'],
  non_compliant: ['remediation', 'archived'], remediation: ['active', 'archived'], archived: [],
};
export const PRIVACY_TERMINAL_STATES: readonly PrivacyStatus[] = ['archived'];
export function isValidPrivacyTransition(from: PrivacyStatus, to: PrivacyStatus): boolean { return PRIVACY_TRANSITIONS[from]?.includes(to) ?? false; }
export function isPrivacyTerminal(state: PrivacyStatus): boolean { return PRIVACY_TERMINAL_STATES.includes(state); }
