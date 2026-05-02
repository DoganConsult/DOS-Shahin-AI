export interface AgentRunContract {
  runId: string;
  agentCode: string;
  state: 'pending' | 'running' | 'awaiting_approval' | 'completed' | 'failed' | 'cancelled';
  startedAt: string;
  completedAt: string | null;
  steps: AgentStepContract[];
}

export interface AgentStepContract {
  stepId: string;
  toolCode: string;
  input: Record<string, unknown>;
  output: Record<string, unknown> | null;
  state: string;
  executedAt: string | null;
}

export interface ProposalContract {
  proposalId: string;
  agentCode: string;
  entityType: string;
  entityId: string;
  action: string;
  rationale: string;
  state: 'draft' | 'submitted' | 'in_review' | 'approved' | 'rejected' | 'applied' | 'archived';
  createdAt: string;
}

export interface RecommendationContract {
  recommendationId: string;
  agentCode: string;
  targetModule: string;
  suggestion: string;
  confidence: number;
  createdAt: string;
}

export interface ExplanationContract {
  explanationId: string;
  runId: string;
  reasoning: string;
  evidence: string[];
  createdAt: string;
}

export interface AiDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}
