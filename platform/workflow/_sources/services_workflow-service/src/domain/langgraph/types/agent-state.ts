// ============================================
// LangGraph Agent State
// Shared state flowing through all graph nodes
// ============================================

import type { BaseMessage } from '@langchain/core/messages';

/** Action proposed by agent reasoning, pending mode-gate approval */
export interface ProposedAction {
  type: 'create_task' | 'send_notification' | 'publish_event' | 'flag_risk' | 'request_evidence' | 'update_record' | 'escalate' | 'discovery_logged';
  title: string;
  description?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  entityType?: string;
  entityId?: string;
  payload?: Record<string, unknown>;
  /** Tier 1 #2: Decision confidence (0-100). Calculated from evidence strength + historical accuracy. */
  confidence?: number;
  agentId?: string;
  proposedAt?: string;
  discoveryCount?: number;
}

/** Discovery surfaced during agent reasoning */
export interface AgentDiscovery {
  type: string;
  summary: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  relatedEntityType?: string;
  relatedEntityId?: string;
  metadata?: Record<string, unknown>;
}

/** Platform autonomy mode — controls action gating */
export type PlatformMode = 'manual' | 'human' | 'hybrid' | 'autonomous' | 'shadow_agent' | 'full_autonomous';

/** Predictive signal from monitoring */
export interface PredictiveSignal {
  type: string;
  shouldTrigger: boolean;
  urgency: 'critical' | 'high' | 'medium' | 'low';
  value?: number;
  confidence?: number;
  reason?: string;
}

/** Audit entry for agent operations */
export interface AgentAuditEntry {
  timestamp: string;
  operation: 'run_started' | 'tool_called' | 'prediction_made' | 'action_proposed' | 'action_executed' | 'action_verified' | 'decision_made' | 'handoff_sent' | 'handoff_received' | 'memory_committed';
  details: Record<string, unknown>;
  correlationId?: string;
  temporalWorkflowId?: string;
  langsmithRunId?: string;
}

/** Scope boundaries for agent execution */
export interface ScopeBoundaries {
  features: string[];
  responsibilityAreas: string[];
  allowedActions: string[];
  forbiddenActions: string[];
  maxAutonomyLevel: 'human' | 'hybrid' | 'shadow_agent' | 'full_autonomous';
}

/** User profile for delegated actions */
export interface UserProfile {
  userId: string;
  email: string;
  role: string;
  department?: string;
  orgUnit?: string;
  preferences?: {
    language?: string;
    timezone?: string;
    notifications?: Record<string, boolean>;
  };
  permissions: string[];
  delegationScope?: string;
  actorId?: string;
  actorType?: 'human' | 'agent' | 'service' | 'external';
  accessTier?: string;
  functionalRoles?: string[];
  jobTitleCode?: string;
  competencies?: string[];
  workloadRecommendation?: string;
}

/** Full state object flowing through the LangGraph StateGraph */
export interface AgentGraphState {
  // --- Identity ---
  tenantId: string;
  agentId: string;
  runId: string;

  // --- Conversation ---
  messages: BaseMessage[];

  // --- Tool tracking ---
  toolCallCount: number;

  // --- Outputs ---
  discoveries: AgentDiscovery[];
  proposedActions: ProposedAction[];
  executedActions: ProposedAction[];
  verifiedActions?: ProposedAction[];
  unverifiedActions?: Array<{ action: ProposedAction; reason: string }>;

  // --- Mode gating ---
  platformMode: PlatformMode;
  autonomyLevel: number; // 0-3

  // --- Context (injected by context_loader node) ---
  orgContext?: Record<string, unknown>;
  agentMemory?: string[];
  handoffs?: Array<{ fromAgent: string; payload: unknown }>;

  // --- Guard state ---
  userId?: string;
  injectionDetected?: boolean;

  // --- Control flow ---
  shouldContinue: boolean;
  error?: string;

  // --- Enhanced fields (Phase 7) ---
  userProfile?: UserProfile;
  scopeBoundaries?: ScopeBoundaries;
  predictiveSignals?: PredictiveSignal[];
  auditEntries?: AgentAuditEntry[];
  tenantIsolationVerified?: boolean;
  urgency?: 'critical' | 'high' | 'medium' | 'low';
}

/** Annotation keys for LangGraph StateGraph channels */
export const AGENT_STATE_CHANNELS = {
  messages: { value: (a: BaseMessage[], b: BaseMessage[]) => [...a, ...b], default: () => [] },
  toolCallCount: { value: (_a: number, b: number) => b, default: () => 0 },
  discoveries: { value: (a: AgentDiscovery[], b: AgentDiscovery[]) => [...a, ...b], default: () => [] },
  proposedActions: { value: (a: ProposedAction[], b: ProposedAction[]) => [...a, ...b], default: () => [] },
  executedActions: { value: (a: ProposedAction[], b: ProposedAction[]) => [...a, ...b], default: () => [] },
  shouldContinue: { value: (_a: boolean, b: boolean) => b, default: () => true },
} as const;
