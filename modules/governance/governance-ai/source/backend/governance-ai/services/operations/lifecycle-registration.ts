import { registerLifecycleDefinition } from '../../ports/lifecycle.port';
import { safeQuery } from "@dos/db";

const SIGNAL_STATES = [
  'detected',
  'interpreting',
  'interpreted',
  'escalated',
  'resolved',
  'dismissed',
  'archived',
] as const;

const SIGNAL_TRANSITIONS: Record<string, string[]> = {
  detected:     ['interpreting', 'dismissed'],
  interpreting: ['interpreted', 'escalated'],
  interpreted:  ['escalated', 'resolved', 'dismissed'],
  escalated:    ['resolved', 'dismissed'],
  resolved:     ['archived'],
  dismissed:    ['archived'],
  archived:     [],
};

registerLifecycleDefinition(
  'governance-ai',
  'governance_signal',
  SIGNAL_STATES,
  SIGNAL_TRANSITIONS,
  {
    initialState: 'detected',
    terminalStates: ['archived'],
  },
);

const MODEL_STATES = [
  'training',
  'testing',
  'active',
  'retired',
] as const;

const MODEL_TRANSITIONS: Record<string, string[]> = {
  training: ['testing'],
  testing:  ['active', 'training'],
  active:   ['retired', 'training'],
  retired:  [],
};

registerLifecycleDefinition(
  'governance-ai',
  'governance_model',
  MODEL_STATES,
  MODEL_TRANSITIONS,
  {
    initialState: 'training',
    terminalStates: ['retired'],
  },
);
