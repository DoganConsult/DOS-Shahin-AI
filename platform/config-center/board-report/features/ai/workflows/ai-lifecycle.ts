export const AI_AGENT_RUN_STATES = [
  'pending', 'running', 'awaiting_approval', 'completed', 'failed', 'cancelled',
] as const;

export type AiAgentRunState = (typeof AI_AGENT_RUN_STATES)[number];

export const AI_PROPOSAL_STATES = [
  'draft', 'submitted', 'in_review', 'approved', 'rejected', 'applied', 'archived',
] as const;

export type AiProposalState = (typeof AI_PROPOSAL_STATES)[number];

export function isTerminalRunState(state: string): boolean {
  return ['completed', 'failed', 'cancelled'].includes(state);
}
