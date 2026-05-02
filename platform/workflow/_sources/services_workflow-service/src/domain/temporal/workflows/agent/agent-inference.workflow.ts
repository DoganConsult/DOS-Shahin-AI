// ============================================
// Agent Inference Cycle Workflow
// Temporal workflow that wraps the LangGraph
// orchestrator for durable, fault-tolerant
// multi-agent execution.
//
// Execution flow:
//   computeExecutionWaves → [runAgentWave]* → correlateDiscoveries → persistCycleSummary
//
// Queue: agrc-agent
// ============================================

import { proxyActivities, sleep } from '@temporalio/workflow';
import type * as agentActivities from '../../activities/agent.activities';
import type * as generalActivities from '../../activities/general.activities';

const {
  initAgentCycle,
  computeExecutionWaves,
  runAgentWave,
  correlateDiscoveries,
  persistCycleSummary,
  cleanupAgentCycle,
  runFullOrchestratorCycle,
} = proxyActivities<typeof agentActivities>({
  startToCloseTimeout: '10m',
  retry: {
    initialInterval: '3s',
    backoffCoefficient: 2,
    maximumAttempts: 4,
    maximumInterval: '45s',
    nonRetryableErrorTypes: ['INVALID_API_KEY', 'BUDGET_EXCEEDED'],
  },
});

const { getProvisionedTenantIds } = proxyActivities<typeof generalActivities>({
  startToCloseTimeout: '30s',
  retry: { maximumAttempts: 3 },
});

/** Input for the agent inference cycle workflow */
export interface AgentInferenceCycleInput {
  tenantId: string;
  /** Optional: restrict to specific agents instead of all 12 */
  agentIds?: string[];
  /** Optional: override platform mode for this cycle */
  platformMode?: string;
}

/** Output of the agent inference cycle workflow */
export interface AgentResult {
  success: boolean;
  discoveryCount: number;
  actionsProposed: number;
  actionsExecuted: number;
  error?: string;
  durationMs: number;
}

export interface AgentInferenceCycleOutput {
  cycleId: string;
  tenantId: string;
  waveCount: number;
  totalAgentsRun: number;
  totalDiscoveries: number;
  totalCorrelations: number;
  agentResults: Record<string, AgentResult>;
  durationMs: number;
}

/**
 * agentInferenceCycleWorkflow — durable multi-agent inference cycle.
 *
 * Orchestrates the execution of all 12 AGRC-OS agents (A01-A12)
 * through dependency-ordered execution waves. Each wave runs its
 * agents in parallel. After all waves complete, cross-agent
 * discoveries are correlated and the cycle summary is persisted.
 *
 * The workflow is checkpoint-resilient: if it fails mid-wave,
 * Temporal will retry from the last successful activity.
 *
 * @param input  Tenant ID and optional agent filter
 * @returns Cycle summary with per-agent results
 */
export async function agentInferenceCycleWorkflow(
  input: AgentInferenceCycleInput,
): Promise<AgentInferenceCycleOutput> {
  const startMs = Date.now();
  const { tenantId, agentIds, platformMode } = input;

  // Step 1: Initialize the cooperation cycle context
  const cycleId = await initAgentCycle(tenantId);

  // Step 2: Compute execution waves from the agent dependency graph
  let waves = await computeExecutionWaves(tenantId);

  // If specific agents requested, filter waves to only include them
  if (agentIds && agentIds.length > 0) {
    const agentSet = new Set(agentIds);
    waves = waves
      .map(w => ({
        ...w,
        agents: w.agents.filter((a: string) => agentSet.has(a)),
      }))
      .filter(w => w.agents.length > 0);
  }

  // Step 3: Execute each wave sequentially; agents within a wave run in parallel
  const allAgentResults: Record<string, AgentResult> = {};

  let totalDiscoveries = 0;
  let totalAgentsRun = 0;

  for (const wave of waves) {
    const waveResults = await runAgentWave(tenantId, {
      waveNumber: wave.wave,
      agents: wave.agents,
      platformMode,
    });

    for (const [agentId, result] of Object.entries(waveResults)) {
      allAgentResults[agentId] = result as AgentResult;
      totalDiscoveries += (result as AgentResult).discoveryCount || 0;
      totalAgentsRun++;
    }

    // Brief pause between waves to allow handoff propagation
    if (waves.indexOf(wave) < waves.length - 1) {
      await sleep('1s');
    }
  }

  // Step 4: Correlate discoveries across all agents
  const correlationCount = await correlateDiscoveries(tenantId);

  // Step 5: Persist the full cycle summary to the database
  await persistCycleSummary(tenantId, cycleId);

  // Step 6: Clean up in-memory cycle context
  await cleanupAgentCycle(tenantId);

  const durationMs = Date.now() - startMs;

  return {
    cycleId,
    tenantId,
    waveCount: waves.length,
    totalAgentsRun,
    totalDiscoveries,
    totalCorrelations: correlationCount,
    agentResults: allAgentResults,
    durationMs,
  };
}

/**
 * agentCycleDispatcherWorkflow — fan-out dispatcher that runs
 * agentInferenceCycleWorkflow for every active tenant in parallel.
 *
 * This is the workflow started by the `agent-inference-runner` Temporal
 * schedule, replacing the legacy node-cron → runAllAgents() path.
 * Registered on TASK_QUEUES.AGENT; called with no arguments.
 */
export async function agentCycleDispatcherWorkflow(): Promise<{
  tenantsDispatched: number;
  tenantsSucceeded: number;
  tenantsFailed: number;
  durationMs: number;
}> {
  const startMs = Date.now();

  const tenantIds = await getProvisionedTenantIds();

  if (tenantIds.length === 0) {
    return { tenantsDispatched: 0, tenantsSucceeded: 0, tenantsFailed: 0, durationMs: Date.now() - startMs };
  }

  const settled = await Promise.allSettled(
    tenantIds.map((tenantId) =>
      runFullOrchestratorCycle(tenantId),
    ),
  );

  let tenantsSucceeded = 0;
  let tenantsFailed = 0;

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      tenantsSucceeded++;
    } else {
      tenantsFailed++;
    }
  }

  return {
    tenantsDispatched: tenantIds.length,
    tenantsSucceeded,
    tenantsFailed,
    durationMs: Date.now() - startMs,
  };
}
