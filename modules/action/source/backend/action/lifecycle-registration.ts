/**
 * Action Module — Lifecycle Registry Registration
 * SINGLE SOURCE OF TRUTH for action_item state machine.
 * All services, routes, contracts, and frontend must align with these states.
 */

import { registerLifecycleDefinition } from './ports/lifecycle.port';

export const ACTION_ITEM_STATES = [
  'open', 'in_progress', 'completed', 'verified', 'closed',
  'overdue', 'escalated', 'cancelled',
] as const;

export type ActionItemState = typeof ACTION_ITEM_STATES[number];

export const ACTION_ITEM_TRANSITIONS: Record<string, string[]> = {
  open:        ['in_progress', 'cancelled'],
  in_progress: ['completed', 'overdue', 'cancelled'],
  completed:   ['verified', 'open'],
  verified:    ['closed'],
  closed:      [],
  overdue:     ['in_progress', 'escalated'],
  escalated:   ['in_progress'],
  cancelled:   ['open'],
};

registerLifecycleDefinition(
  'action',
  'action_item',
  ACTION_ITEM_STATES,
  ACTION_ITEM_TRANSITIONS,
  {
    initialState: 'open',
    terminalStates: ['closed'],
    transitionPermissions: {
      'open->in_progress': 'action.item.update',
      'in_progress->completed': 'action.item.update',
      'completed->verified': 'action.item.verify',
      'verified->closed': 'action.item.close',
      'in_progress->overdue': 'action.item.update',
      'overdue->escalated': 'action.item.escalate',
      'escalated->in_progress': 'action.item.update',
      'open->cancelled': 'action.item.cancel',
      'in_progress->cancelled': 'action.item.cancel',
      'cancelled->open': 'action.item.reopen',
      'completed->open': 'action.item.reopen',
    },
  },
);
