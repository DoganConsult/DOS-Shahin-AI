import type { ActionStatus } from '../contracts/action.contracts';

export const ACTION_STATES: readonly ActionStatus[] = [
  'open', 'assigned', 'in_progress', 'blocked', 'completed', 'verified', 'cancelled', 'archived',
] as const;

export const ACTION_TRANSITIONS: Record<ActionStatus, ActionStatus[]> = {
  open: ['assigned', 'cancelled', 'archived'],
  assigned: ['in_progress', 'blocked', 'cancelled'],
  in_progress: ['completed', 'blocked', 'cancelled'],
  blocked: ['in_progress', 'cancelled'],
  completed: ['verified', 'in_progress'],
  verified: ['archived'],
  cancelled: ['archived'],
  archived: [],
};

export const ACTION_TERMINAL_STATES: readonly ActionStatus[] = ['archived'];

export function isValidActionTransition(from: ActionStatus, to: ActionStatus): boolean {
  return ACTION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isActionTerminal(state: ActionStatus): boolean {
  return ACTION_TERMINAL_STATES.includes(state);
}
