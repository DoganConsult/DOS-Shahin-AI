import type { AgentRunContract, ProposalContract } from '../contracts/ai.contracts';

export function mockAgentRun(overrides?: Partial<AgentRunContract>): AgentRunContract {
  return {
    runId: 'run-001',
    agentCode: 'test-agent',
    state: 'completed',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    steps: [],
    ...overrides,
  };
}

export function mockProposal(overrides?: Partial<ProposalContract>): ProposalContract {
  return {
    proposalId: 'prop-001',
    agentCode: 'test-agent',
    entityType: 'risk',
    entityId: 'risk-001',
    action: 'mitigate',
    rationale: 'Test rationale',
    state: 'draft',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}
