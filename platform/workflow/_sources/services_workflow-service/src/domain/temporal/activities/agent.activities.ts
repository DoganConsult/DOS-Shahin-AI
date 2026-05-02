// ============================================
// Agent Activities
// Wraps the LangGraph orchestrator graph for
// durable multi-agent cycle execution via Temporal.
// Called by agent-inference.workflow.ts.
// ============================================

import { assertTenantId } from '@dos/db';
import { runOrchestratorGraph } from '../../langgraph/graphs/orchestrator.graph';
import {
  initCycleContext,
  closeCycleContext,
  correlateDiscoveries as correlateDiscoveriesService,
  computeExecutionWaves as computeExecutionWavesService,
  persistCycleSummary as persistCycleSummaryService,
} from '../../../adapters/agent-cooperation.adapter';
import { runSingleAgentGraph } from '../../langgraph/graphs/single-agent.graph';

import { getTenantPlatformMode } from '@dos/platform-core/settings/platform-mode-gate.service';
import { createTypedTimeout } from '../resilience/activity-timeout';
import { executeWithBreaker } from '../resilience/circuit-breaker';
import { toErrorMessage } from '@dos/platform-core/resilience';
import type { GenericRow } from '@dos/types';

export interface AgentWaveInput {
  waveNumber: number;
  agents: string[];
  platformMode?: string;
}

export interface AgentWaveResult {
  [agentId: string]: {
    success: boolean;
    discoveryCount: number;
    actionsProposed: number;
    actionsExecuted: number;
    error?: string;
    durationMs: number;
  };
}

export async function initAgentCycle(tenantId: string): Promise<string> {
  assertTenantId(tenantId);
  const ctx = initCycleContext(tenantId);
  return ctx.cycleId;
}

export async function computeExecutionWaves(
  tenantId: string,
): Promise<Array<{ wave: number; agents: string[] }>> {
  assertTenantId(tenantId);
  const waves = computeExecutionWavesService();
  return waves.map((w: GenericRow) => ({ wave: w.wave, agents: w.agents }));
}

export async function runAgentWave(tenantId: string, wave: AgentWaveInput): Promise<AgentWaveResult> {
  assertTenantId(tenantId);
  const platformMode = wave.platformMode || (await getTenantPlatformMode(tenantId));
  const results: AgentWaveResult = {};

  await Promise.allSettled(
    wave.agents.map(async (agentId) => {
      const startMs = Date.now();
      try {
        const aiTimeout = createTypedTimeout('ai', `agent-${agentId}`, 120_000);
        const result = await aiTimeout(() => runSingleAgentGraph(tenantId, agentId, {
          platformMode: platformMode as any,
        }));
        results[agentId] = {
          success: !result.error,
          discoveryCount: result.discoveries?.length ?? 0,
          actionsProposed: result.proposedActions?.length ?? 0,
          actionsExecuted: result.executedActions?.length ?? 0,
          error: result.error || undefined,
          durationMs: Date.now() - startMs,
        };
      } catch (err: unknown) {
        results[agentId] = {
          success: false,
          discoveryCount: 0,
          actionsProposed: 0,
          actionsExecuted: 0,
          error: toErrorMessage(err),
          durationMs: Date.now() - startMs,
        };
      }
    }),
  );

  return results;
}

export async function correlateDiscoveries(tenantId: string): Promise<number> {
  assertTenantId(tenantId);
  const correlations = correlateDiscoveriesService(tenantId);
  return Array.isArray(correlations) ? correlations.length : 0;
}

export async function persistCycleSummary(tenantId: string, _cycleId: string): Promise<void> {
  assertTenantId(tenantId);
  await persistCycleSummaryService(tenantId);
}

export async function cleanupAgentCycle(tenantId: string): Promise<void> {
  assertTenantId(tenantId);
  closeCycleContext(tenantId);
}

export async function runFullOrchestratorCycle(tenantId: string): Promise<{
  cycleId: string;
  waveCount: number;
  agentCount: number;
  totalDiscoveries: number;
}> {
  assertTenantId(tenantId);
  const result = await executeWithBreaker(
    'agent-orchestrator',
    () => runOrchestratorGraph(tenantId),
    { failureThreshold: 2, recoveryTimeMs: 60_000 },
  );
  return {
    cycleId: result.cycleId,
    waveCount: result.waves?.length ?? 0,
    agentCount: Object.keys(result.agentResults ?? {}).length,
    totalDiscoveries: result.allDiscoveries?.length ?? 0,
  };
}
