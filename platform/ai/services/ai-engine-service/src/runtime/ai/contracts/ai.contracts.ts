export interface AgentRunContract {
  runId: string;
  agentId: string;
  agentCode: string;
  moduleCode: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
  triggerType: 'manual' | 'event' | 'schedule' | 'workflow' | 'cascade';
  startedAt: string;
  completedAt: string | null;
  durationMs: number | null;
  stepCount: number;
  failedStepCount: number;
  triggeredBy: string;
  correlationId: string | null;
}

export interface AgentProposalContract {
  proposalId: string;
  runId: string;
  agentCode: string;
  moduleCode: string;
  entityType: string;
  entityId: string | null;
  proposalType: 'create' | 'update' | 'transition' | 'recommendation' | 'remediation';
  status: 'pending_review' | 'approved' | 'rejected' | 'auto_applied' | 'expired';
  confidence: number | null;
  summary: string;
  payload: Record<string, unknown>;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

export interface AgentRecommendationContract {
  recommendationId: string;
  agentCode: string;
  moduleCode: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  titleEn: string;
  descriptionEn: string;
  confidence: number | null;
  status: 'open' | 'accepted' | 'dismissed' | 'implemented' | 'expired';
  actionable: boolean;
  createdAt: string;
  expiresAt: string | null;
}

export interface AgentExplanationContract {
  explanationId: string;
  runId: string;
  stepIndex: number;
  action: string;
  reasoning: string;
  inputSummary: string;
  outputSummary: string;
  confidenceScore: number | null;
  modelUsed: string | null;
  tokensUsed: number | null;
  createdAt: string;
}

export interface ToolExecutionResultContract {
  executionId: string;
  runId: string;
  toolCode: string;
  moduleCode: string;
  status: 'success' | 'failed' | 'timeout' | 'denied';
  inputHash: string | null;
  durationMs: number | null;
  errorMessage: string | null;
  executedAt: string;
}

export interface PromptConfigContract {
  configId: string;
  promptCode: string;
  moduleCode: string | null;
  version: number;
  status: 'active' | 'draft' | 'deprecated';
  modelId: string;
  maxTokens: number;
  temperature: number;
  systemPromptPreview: string | null;
  updatedAt: string;
}

export interface AiCostUsageContract {
  periodStart: string;
  periodEnd: string;
  totalRuns: number;
  totalTokens: number;
  totalCostUsd: number | null;
  runsByAgent: Record<string, number>;
  tokensByModel: Record<string, number>;
}

export interface AiDiagnosticsContract {
  tenantId: string;
  totalAgents: number;
  activeAgents: number;
  totalRuns24h: number;
  failedRuns24h: number;
  pendingProposals: number;
  openRecommendations: number;
  averageRunDurationMs: number | null;
  toolExecutionFailureRate: number | null;
  modelHealthy: boolean;
  gatewayHealthy: boolean;
  capturedAt: string;
}

export interface AiAdminSettingsContract {
  globalAiEnabled: boolean;
  maxConcurrentRuns: number;
  defaultModel: string;
  costBudgetUsd: number | null;
  autonomyLevel: 'full' | 'semi' | 'manual';
  killSwitchActive: boolean;
  proposalAutoApprove: boolean;
}

export interface AiListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  agentCode?: string;
  moduleCode?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AiListResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ── Kernel OS Contracts (Rule 1.4) ──

export interface KernelProcessDto {
  pid: string;
  agentId: string;
  state: 'running' | 'queued' | 'blocked' | 'completed' | 'failed' | 'cancelled';
  priority: string;
  durationMs: number | null;
  memoryUsed: number;
  exitCode: number | null;
}

export interface KernelStatusDto {
  uptime: string;
  memoryPressure: string;
  schedulerLoad: number;
  resourceUsage: {
    tokenUtilization: number;
    tokensUsed24h: number;
    avgLatencyMs: number;
    errorRate: number;
  };
}
