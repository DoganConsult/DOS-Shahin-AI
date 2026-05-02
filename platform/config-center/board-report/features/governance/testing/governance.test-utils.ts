import type { GovernanceBodyContract, GovernanceDecisionContract } from '../contracts/governance.contracts';

export function mockGovernanceBody(overrides?: Partial<GovernanceBodyContract>): GovernanceBodyContract {
  return {
    bodyId: 'body-001',
    code: 'board-of-directors',
    nameEn: 'Board of Directors',
    nameAr: null,
    bodyType: 'board',
    status: 'active',
    chairId: 'user-001',
    memberCount: 9,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockGovernanceDecision(overrides?: Partial<GovernanceDecisionContract>): GovernanceDecisionContract {
  return {
    decisionId: 'dec-001',
    bodyId: 'body-001',
    title: 'Approve risk appetite statement',
    state: 'proposed',
    decidedAt: null,
    ...overrides,
  };
}
