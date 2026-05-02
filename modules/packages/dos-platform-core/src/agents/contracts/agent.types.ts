export type AgentExecutionMode = 'human_only' | 'ai_assisted' | 'ai_copilot' | 'ai_autonomous' | (string & {});

export interface AgentRetryPolicy {
  maxRetries: number;
  baseDelayMs: number;
  backoffMultiplier?: number;
}

export interface AgentEscalationRule {
  afterMinutes: number;
  toRole?: string;
  toUserId?: string;
  reason?: string;
}

export interface AgentApprovalPolicy {
  required: boolean;
  approverRole?: string;
}

export interface AgentHealthPolicy {
  maxConsecutiveFailures?: number;
  quarantineMinutes?: number;
}

export interface AgentReplacementPolicy {
  allowReplacement?: boolean;
  replacementRole?: string;
}

export interface AgentObservabilityProfile {
  sampleRate?: number;
  logInputs?: boolean;
  logOutputs?: boolean;
}

export interface AgentDefinition {
  agentId: string;
  name: string;
  moduleCode?: string;
  mode?: AgentExecutionMode;
  retry?: AgentRetryPolicy;
  escalation?: AgentEscalationRule[];
  approval?: AgentApprovalPolicy;
  health?: AgentHealthPolicy;
  replacement?: AgentReplacementPolicy;
  observability?: AgentObservabilityProfile;
  metadata?: Record<string, unknown>;
}

