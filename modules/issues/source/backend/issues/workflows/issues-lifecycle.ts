export const ISSUE_STATES = [
  'draft', 'reported', 'triaged', 'assigned', 'investigating',
  'escalated', 'resolved', 'verified', 'closed', 'reopened', 'archived',
] as const;

export type IssueState = (typeof ISSUE_STATES)[number];

export const ISSUE_TRANSITIONS: Record<IssueState, IssueState[]> = {
  draft: ['reported'],
  reported: ['triaged', 'assigned'],
  triaged: ['assigned', 'closed'],
  assigned: ['investigating'],
  investigating: ['resolved', 'escalated'],
  escalated: ['investigating', 'assigned'],
  resolved: ['verified', 'reopened'],
  verified: ['closed'],
  closed: ['reopened', 'archived'],
  reopened: ['assigned', 'investigating'],
  archived: [],
};
