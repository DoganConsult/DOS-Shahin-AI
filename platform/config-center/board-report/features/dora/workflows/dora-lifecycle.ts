import type { DoraObligationStatus } from '../contracts/dora.contracts';
export const DORA_STATES: readonly DoraObligationStatus[] = ['identified', 'mapped', 'implementing', 'compliant', 'non_compliant', 'partially_compliant', 'archived'] as const;
export const DORA_TRANSITIONS: Record<DoraObligationStatus, DoraObligationStatus[]> = {
  identified: ['mapped', 'archived'], mapped: ['implementing', 'archived'], implementing: ['compliant', 'partially_compliant', 'non_compliant'],
  compliant: ['non_compliant', 'partially_compliant', 'archived'], non_compliant: ['implementing', 'archived'],
  partially_compliant: ['implementing', 'compliant', 'archived'], archived: [],
};
export const DORA_TERMINAL_STATES: readonly DoraObligationStatus[] = ['archived'];
export function isValidDoraTransition(from: DoraObligationStatus, to: DoraObligationStatus): boolean { return DORA_TRANSITIONS[from]?.includes(to) ?? false; }
export function isDoraTerminal(state: DoraObligationStatus): boolean { return DORA_TERMINAL_STATES.includes(state); }
