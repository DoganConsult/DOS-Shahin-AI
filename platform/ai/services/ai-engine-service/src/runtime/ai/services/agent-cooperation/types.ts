// ============================================
// AGRC-OS — Agent Cooperation Types
// Shared type definitions for agent cooperation,
// handoffs, discoveries, and correlations.
// ============================================

import type { AgentHandoff } from '../../ports/platform.port';
import { safeQuery } from "@dos/db";

export type { AgentHandoff };

export interface SharedAgentContext {
  tenantId: string;
  cycleId: string;
  discoveries: AgentDiscovery[];
  handoffs: AgentHandoff[];
  correlations: CrossAgentCorrelation[];
}

export interface AgentDiscovery {
  id: string;
  agentId: string;
  type: 'risk' | 'gap' | 'violation' | 'anomaly' | 'recommendation';
  severity: 'critical' | 'high' | 'medium' | 'low';
  entityType: string;
  entityId?: string;
  title: string;
  details: string;
  timestamp: string;
}

export interface CrossAgentCorrelation {
  id: string;
  correlationId: string;
  agents: string[];
  pattern: string;
  combinedSeverity: 'critical' | 'high' | 'medium' | 'low';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  sharedEntity: string;
  findings: unknown[];
  relatedDiscoveries: string[];
}

export interface AgentConflictCandidate {
  entityType: string;
  entityId: string | undefined;
  conflictType: 'contradictory_outcome' | 'severity_disagreement' | 'action_conflict';
  proposals: Array<{ agentId: string; discovery: AgentDiscovery }>;
}

export interface ExecutionWave {
  wave: number;
  agents: string[];
  dependenciesMet: boolean;
}

export interface SharedFinding {
  id: string;
  fromAgentId: string;
  toAgentId: string;
  tenantId: string;
  finding: Record<string, unknown>;
  sharedAt: string;
  acknowledged: boolean;
}

export const ProcessTaskType = (..._args: any[]): any => { return {} as any; };