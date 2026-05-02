export const ACTION_STATES = [
  'pending', 'assigned', 'in_progress', 'overdue', 'escalated',
  'completed', 'verified', 'cancelled', 'archived',
] as const;

export type ActionState = (typeof ACTION_STATES)[number];

export const ACTION_TRANSITIONS: Record<ActionState, ActionState[]> = {
  pending: ['assigned', 'cancelled'],
  assigned: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'overdue', 'escalated', 'cancelled'],
  overdue: ['in_progress', 'escalated', 'cancelled'],
  escalated: ['in_progress', 'cancelled'],
  completed: ['verified', 'archived'],
  verified: ['archived'],
  cancelled: ['archived'],
  archived: [],
};
