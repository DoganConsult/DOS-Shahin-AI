// @ts-nocheck — module-layer imports not yet extracted
import { AGRC_AGENTS } from '../agrc-agents';
import type { AgentGovernance } from '@dos/contracts';
import type { AgentDef } from '@dos/types';
import {
  registerAgent,
  registerAgentBatch,
  getAgentDefinition,
  getAllAgentDefinitions,
} from '@dos/platform-core/agents/registry/agent-registry.service';
import { persistAgentRegistration } from '@dos/platform-core/agents/registry/agent-registry.service';
import { syncAgentTools } from '@dos/platform-core/agents/tools/tool-sync-adapter.service';
import { registerShahinAgentInstructions } from './register-shahin-instructions';
import type {
  AgentDefinition,
  AgentApprovalPolicy,
  AgentReplacementPolicy,
  AgentRetryPolicy,
  AgentHealthPolicy,
  AgentObservabilityProfile,
  AgentEscalationRule,
  AgentExecutionMode,
} from '@dos/platform-core/agents/contracts/agent.types';

const APPROVAL_MAP: Record<string, number> = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

function mapExecutionMode(governance?: AgentGovernance): AgentExecutionMode {
  if (!governance) return 'advisory';
  const boundary = governance.approvalBoundary;
  if (boundary === 'high') return 'co-pilot';
  if (boundary === 'medium') return 'drafting';
  return 'advisory';
}

function mapEscalationRules(governance?: AgentGovernance): AgentEscalationRule[] {
  if (!governance?.escalationPolicy) return [];
  const target = governance.escalationPolicy.escalateTo === 'human' ? 'human' as const : 'supervisor_agent' as const;
  return [
    {
      condition: 'timeout',
      target,
      targetId: governance.escalationPolicy.escalateTo !== 'human' ? governance.escalationPolicy.escalateTo : undefined,
      description: `Escalate after ${governance.escalationPolicy.afterMinutes}m timeout`,
    },
    {
      condition: 'tool_failure',
      target,
      targetId: governance.escalationPolicy.escalateTo !== 'human' ? governance.escalationPolicy.escalateTo : undefined,
      description: 'Escalate on tool failure',
    },
  ];
}

function mapApprovalPolicy(governance?: AgentGovernance): AgentApprovalPolicy {
  const boundary = governance?.approvalBoundary ?? 'low';
  const threshold = APPROVAL_MAP[boundary] ?? 1;
  return {
    requiresApprovalForWrite: threshold >= 2,
    highRiskThreshold: Math.max(threshold, 2),
    autoApproveBelow: Math.max(threshold - 1, 0),
    humanReviewRequired: boundary === 'high',
    selfApprovalBlocked: true,
    blockedActionCategories: [],
    fallbackResponse: 'deny',
    safeRefusalBehavior: 'return_empty',
  };
}

function mapReplacementPolicy(): AgentReplacementPolicy {
  return {
    posture: 'preplacement',
    targetRoles: [],
    allowedAutomationDepth: 'advisory',
    prohibitedZones: [],
    requiresGovernanceApproval: false,
    measurementCriteria: [],
    rollbackCriteria: [],
    supervisionRequired: false,
    accountabilityOwner: 'platform-admin',
  };
}

function mapRetryPolicy(): AgentRetryPolicy {
  return {
    maxRetries: 2,
    retryDelayMs: 1000,
    retryableErrors: ['TIMEOUT', 'RATE_LIMIT', 'TRANSIENT'],
  };
}

function mapHealthPolicy(): AgentHealthPolicy {
  return {
    maxConsecutiveFailures: 5,
    healthCheckIntervalSeconds: 120,
    circuitBreakerThreshold: 8,
    cooldownSeconds: 300,
    autoDisableOnFailure: true,
  };
}

function mapObservabilityProfile(governance?: AgentGovernance): AgentObservabilityProfile {
  const full = governance?.auditLevel === 'full';
  return {
    logRunDetails: true,
    logToolCalls: true,
    logDecisions: full,
    logApprovals: true,
    trackCost: true,
    trackTokenUsage: true,
    trackLatency: true,
  };
}

function resolveAllowedTools(agentCode: string): string[] {
  try {
    const { getToolsForAgent } = require('../../../ai/tools/tool-registry');
    const tools = getToolsForAgent(agentCode, '__bootstrap__');
    return tools.map((t: { name: string }) => `${agentCode.toLowerCase()}.${t.name}`);
  } catch {
    return [];
  }
}

export function mapAgentDefToDefinition(def: AgentDef): AgentDefinition {
  const governance = def.governance;
  return {
    agentCode: def.id,
    name: def.name,
    version: '1.0.0',
    agentType: 'product',
    ownerLayer: 'product',
    ownerCode: 'shahin-ai',
    executionMode: mapExecutionMode(governance),
    defaultState: 'active',
    allowedTools: resolveAllowedTools(def.id),
    allowedContexts: governance?.allowedInputTypes ?? ['*'],
    allowedTaskTypes: governance?.allowedOutputTypes ?? [],
    allowedTriggerSources: ['user', 'event', 'schedule', 'workflow', 'system'],
    writeBoundaries: [def.moduleCode + '.'],
    completionSignals: [],
    requiredCapabilities: [],
    instructionSource: 'registry',
    escalationRules: mapEscalationRules(governance),
    approvalPolicy: mapApprovalPolicy(governance),
    replacementPolicy: mapReplacementPolicy(),
    retryPolicy: mapRetryPolicy(),
    eventSubscriptions: ['agent.task.created'],
    healthPolicy: mapHealthPolicy(),
    observabilityProfile: mapObservabilityProfile(governance),
    uiExposurePolicy: 'visible',
  };
}

let _bootstrapped = false;

export async function bootstrapShahinAgents(tenantId?: string): Promise<void> {
  if (_bootstrapped) return;

  const definitions = AGRC_AGENTS.map(mapAgentDefToDefinition);
  for (const def of definitions) {
    if (!getAgentDefinition(def.agentCode)) {
      registerAgent(def);
    }
  }

  for (const def of definitions) {
    syncAgentTools(def.agentCode, tenantId || '__bootstrap__');
  }

  try {
    await registerShahinAgentInstructions();
  } catch {
    // Non-fatal: instruction registration falls back to inline copilot prompt
  }

  if (tenantId) {
    for (const def of definitions) {
      await persistAgentRegistration(tenantId, def);
    }
  }

  _bootstrapped = true;
}

export function isBootstrapped(): boolean {
  return _bootstrapped;
}

export function resetBootstrap(): void {
  _bootstrapped = false;
}
