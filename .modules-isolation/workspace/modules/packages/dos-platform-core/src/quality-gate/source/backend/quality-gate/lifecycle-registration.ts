/**
 * quality-gate — Lifecycle Registration
 * State machine for quality gate run lifecycle.
 */

import { registerLifecycleDefinition } from './ports/lifecycle.port';

const QGATE_STATES = [
  'pending',
  'running',
  'passed',
  'failed',
  'overridden',
  'skipped',
] as const;

const QGATE_TRANSITIONS: Record<string, string[]> = {
  pending:    ['running', 'skipped'],
  running:    ['passed', 'failed'],
  failed:     ['overridden', 'running'],  // re-run or override
  passed:     [],                          // terminal
  overridden: [],                          // terminal
  skipped:    [],                          // terminal
};

registerLifecycleDefinition(
  'quality-gate',
  'quality-gate',
  QGATE_STATES as unknown as string[],
  QGATE_TRANSITIONS,
  {
    initialState: 'pending',
    terminalStates: ['passed', 'overridden', 'skipped'],
    transitionPermissions: {
      'pending->running':   'quality-gate.run.execute',
      'pending->skipped':   'quality-gate.run.override',
      'running->passed':    'quality-gate.run.execute',
      'running->failed':    'quality-gate.run.execute',
      'failed->overridden': 'quality-gate.run.override',
      'failed->running':    'quality-gate.run.execute',
    },
  },
);
