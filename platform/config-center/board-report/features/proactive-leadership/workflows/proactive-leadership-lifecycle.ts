import type { LeadershipInsightStatus } from '../contracts/proactive-leadership.contracts';

export const LEADERSHIP_INSIGHT_STATES: readonly LeadershipInsightStatus[] = [
  'generated', 'reviewed', 'presented', 'actioned', 'dismissed', 'archived',
] as const;

export const LEADERSHIP_INSIGHT_TRANSITIONS: Record<LeadershipInsightStatus, LeadershipInsightStatus[]> = {
  generated: ['reviewed', 'dismissed'],
  reviewed: ['presented', 'dismissed', 'archived'],
  presented: ['actioned', 'dismissed', 'archived'],
  actioned: ['archived'],
  dismissed: ['archived'],
  archived: [],
};

export const LEADERSHIP_TERMINAL_STATES: readonly LeadershipInsightStatus[] = ['archived'];

export function isValidLeadershipTransition(from: LeadershipInsightStatus, to: LeadershipInsightStatus): boolean {
  return LEADERSHIP_INSIGHT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isLeadershipTerminal(state: LeadershipInsightStatus): boolean {
  return LEADERSHIP_TERMINAL_STATES.includes(state);
}
