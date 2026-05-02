import type { RemediationStatus } from '../contracts/remediation.contracts';

export const REMEDIATION_STATES: readonly RemediationStatus[] = [
  'planned', 'assigned', 'in_progress', 'blocked', 'escalated',
  'pending_verification', 'verified', 'closed', 'archived',
] as const;

export const REMEDIATION_TRANSITIONS: Record<RemediationStatus, RemediationStatus[]> = {
  planned: ['assigned', 'archived'],
  assigned: ['in_progress', 'blocked', 'archived'],
  in_progress: ['pending_verification', 'blocked', 'escalated'],
  blocked: ['in_progress', 'escalated', 'archived'],
  escalated: ['in_progress', 'blocked', 'pending_verification'],
  pending_verification: ['verified', 'in_progress'],
  verified: ['closed'],
  closed: ['archived'],
  archived: [],
};

export const REMEDIATION_TERMINAL_STATES: readonly RemediationStatus[] = ['archived'];

export function isValidRemediationTransition(from: RemediationStatus, to: RemediationStatus): boolean {
  return REMEDIATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isRemediationTerminal(state: RemediationStatus): boolean {
  return REMEDIATION_TERMINAL_STATES.includes(state);
}
