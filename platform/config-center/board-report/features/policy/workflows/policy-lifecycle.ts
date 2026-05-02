import type { PolicyStatus } from '../contracts/policy.contracts';

export const POLICY_STATES: readonly PolicyStatus[] = [
  'draft', 'in_review', 'approved', 'published', 'under_revision', 'retired', 'archived',
] as const;

export const POLICY_TRANSITIONS: Record<PolicyStatus, PolicyStatus[]> = {
  draft: ['in_review', 'archived'],
  in_review: ['approved', 'draft', 'archived'],
  approved: ['published', 'in_review', 'archived'],
  published: ['under_revision', 'retired'],
  under_revision: ['in_review', 'published'],
  retired: ['archived'],
  archived: [],
};

export const POLICY_TERMINAL_STATES: readonly PolicyStatus[] = ['archived'];

export function isValidPolicyTransition(from: PolicyStatus, to: PolicyStatus): boolean {
  return POLICY_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isPolicyTerminal(state: PolicyStatus): boolean {
  return POLICY_TERMINAL_STATES.includes(state);
}
