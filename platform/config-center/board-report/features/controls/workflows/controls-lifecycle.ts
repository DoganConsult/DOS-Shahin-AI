import type { ControlStatus } from '../contracts/controls.contracts';

export const CONTROL_STATES: readonly ControlStatus[] = [
  'draft', 'active', 'under_review', 'ineffective', 'retired', 'archived',
] as const;

export const CONTROL_TRANSITIONS: Record<ControlStatus, ControlStatus[]> = {
  draft: ['active', 'archived'],
  active: ['under_review', 'ineffective', 'retired', 'archived'],
  under_review: ['active', 'ineffective', 'retired'],
  ineffective: ['under_review', 'active', 'retired', 'archived'],
  retired: ['archived'],
  archived: [],
};

export const CONTROL_TERMINAL_STATES: readonly ControlStatus[] = ['archived'];

export function isValidControlTransition(from: ControlStatus, to: ControlStatus): boolean {
  return CONTROL_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isControlTerminal(state: ControlStatus): boolean {
  return CONTROL_TERMINAL_STATES.includes(state);
}

export function isControlTestable(state: ControlStatus): boolean {
  return ['active', 'under_review', 'ineffective'].includes(state);
}
