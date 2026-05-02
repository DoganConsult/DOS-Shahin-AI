import type { JourneyStatus } from '../contracts/journey.contracts';
export const JOURNEY_STATES: readonly JourneyStatus[] = ['not_started', 'in_progress', 'paused', 'completed', 'abandoned', 'archived'] as const;
export const JOURNEY_TRANSITIONS: Record<JourneyStatus, JourneyStatus[]> = {
  not_started: ['in_progress', 'abandoned'], in_progress: ['paused', 'completed', 'abandoned'],
  paused: ['in_progress', 'abandoned'], completed: ['archived'], abandoned: ['archived'], archived: [],
};
export const JOURNEY_TERMINAL_STATES: readonly JourneyStatus[] = ['archived'];
export function isValidJourneyTransition(from: JourneyStatus, to: JourneyStatus): boolean { return JOURNEY_TRANSITIONS[from]?.includes(to) ?? false; }
export function isJourneyTerminal(state: JourneyStatus): boolean { return JOURNEY_TERMINAL_STATES.includes(state); }
