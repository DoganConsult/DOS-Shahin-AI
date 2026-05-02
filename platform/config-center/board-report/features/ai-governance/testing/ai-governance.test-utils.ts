import type { AiModelRegistryContract, AiRiskAssessmentContract } from '../contracts/ai-governance.contracts';

export function mockAiModel(overrides?: Partial<AiModelRegistryContract>): AiModelRegistryContract {
  return {
    modelId: 'model-001',
    name: 'GPT-4o Risk Analyzer',
    provider: 'openai',
    version: '4o-2024-08-06',
    state: 'deployed',
    riskTier: 'medium',
    lastAssessedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function mockAiRiskAssessment(overrides?: Partial<AiRiskAssessmentContract>): AiRiskAssessmentContract {
  return {
    assessmentId: 'assess-001',
    modelId: 'model-001',
    state: 'completed',
    riskScore: 42,
    assessorId: 'user-001',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    ...overrides,
  };
}
