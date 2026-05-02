import type { IssueStatus } from '../contracts/issues.contracts';
export const ISSUE_STATES: readonly IssueStatus[] = ['open', 'triaged', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed', 'archived'] as const;
export const ISSUE_TRANSITIONS: Record<IssueStatus, IssueStatus[]> = {
  open: ['triaged', 'assigned', 'archived'], triaged: ['assigned', 'escalated'], assigned: ['in_progress', 'escalated'],
  in_progress: ['resolved', 'escalated', 'assigned'], escalated: ['in_progress', 'assigned'],
  resolved: ['closed', 'in_progress'], closed: ['archived'], archived: [],
};
export const ISSUE_TERMINAL_STATES: readonly IssueStatus[] = ['archived'];
export function isValidIssueTransition(from: IssueStatus, to: IssueStatus): boolean { return ISSUE_TRANSITIONS[from]?.includes(to) ?? false; }
export function isIssueTerminal(state: IssueStatus): boolean { return ISSUE_TERMINAL_STATES.includes(state); }
