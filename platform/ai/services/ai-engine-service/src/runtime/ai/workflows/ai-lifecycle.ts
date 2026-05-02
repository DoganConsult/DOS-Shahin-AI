export const AI_AGENT_RUN_STATES = [
  'pending',
  'running',
  'awaiting_approval',
  'completed',
  'failed',
  'cancelled',
] as const;

export type AiAgentRunState = (typeof AI_AGENT_RUN_STATES)[number];

export const AI_AGENT_RUN_TRANSITIONS: Record<AiAgentRunState, AiAgentRunState[]> = {
  pending: ['running', 'cancelled'],
  running: ['awaiting_approval', 'completed', 'failed', 'cancelled'],
  awaiting_approval: ['running', 'cancelled'],
  completed: [],
  failed: ['pending'],
  cancelled: [],
};

export const AI_PROPOSAL_STATES = [
  'draft',
  'submitted',
  'in_review',
  'approved',
  'rejected',
  'applied',
  'archived',
] as const;

export type AiProposalState = (typeof AI_PROPOSAL_STATES)[number];

export const AI_PROPOSAL_TRANSITIONS: Record<AiProposalState, AiProposalState[]> = {
  draft: ['submitted'],
  submitted: ['in_review'],
  in_review: ['approved', 'rejected'],
  approved: ['applied', 'archived'],
  rejected: ['draft', 'archived'],
  applied: ['archived'],
  archived: [],
};

export function isTerminalRunState(state: string): boolean {
  return ['completed', 'failed', 'cancelled'].includes(state);
}
