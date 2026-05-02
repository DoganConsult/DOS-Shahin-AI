import type { EngineRunStatus } from '../contracts/agrc-engine.contracts';
export const ENGINE_RUN_STATES: readonly EngineRunStatus[] = ['idle', 'scheduled', 'running', 'completed', 'failed', 'paused'] as const;
export const ENGINE_RUN_TRANSITIONS: Record<EngineRunStatus, EngineRunStatus[]> = {
  idle: ['scheduled'], scheduled: ['running', 'paused'], running: ['completed', 'failed', 'paused'],
  completed: ['idle'], failed: ['idle', 'scheduled'], paused: ['scheduled', 'idle'],
};
export function isValidEngineRunTransition(from: EngineRunStatus, to: EngineRunStatus): boolean { return ENGINE_RUN_TRANSITIONS[from]?.includes(to) ?? false; }
