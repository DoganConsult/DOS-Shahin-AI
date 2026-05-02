// ============================================
// Agent Activities
// Wraps the LangGraph orchestrator graph for
// durable multi-agent cycle execution via Temporal.
// Called by agent-inference.workflow.ts.
// ============================================

import { assertTenantId } from '@dos/db';
// REPLACED: Decoupled via HTTP REST to ai-engine-service on port 3005
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://127.0.0.1:3005';

async function fetchAiClient<T = any>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${AI_ENGINE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`AI Engine API Error: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

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
  const result = await fetchAiClient(`/api/ai-engine/cycle/init`, { tenantId }).catch(() => ({ cycleId: `cycle_${Date.now()}` }));
  return result.cycleId;
}

export async function computeExecutionWaves(
  tenantId: string,
): Promise<Array<{ wave: number; agents: string[] }>> {
  assertTenantId(tenantId);
  const result = await fetchAiClient(`/api/ai-engine/cycle/waves`, { tenantId }).catch(() => ({ waves: [{ wave: 1, agents: ['A07', 'A09'] }] }));
  return result.waves.map((w: any) => ({ wave: w.wave, agents: w.agents }));
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
        const result = await aiTimeout(() => fetchAiClient(`/api/ai-engine/agent/${agentId}/invoke`, {
          tenantId,
          platformMode: platformMode as any,
          dryRun: false,
        }));
        results[agentId] = {
          success: !result.error,
          discoveryCount: result.discoveries?.length ?? 0,
          actionsProposed: result.actionsProposed ?? 0,
          actionsExecuted: result.actionsExecuted ?? 0,
          error: result.error || undefined,
          durationMs: result.durationMs ?? (Date.now() - startMs),
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
  const result = await fetchAiClient(`/api/ai-engine/cycle/correlate`, { tenantId }).catch(() => ({ correlated: 0 }));
  return result.correlated || 0;
}

export async function persistCycleSummary(tenantId: string, _cycleId: string): Promise<void> {
  assertTenantId(tenantId);
  await fetchAiClient(`/api/ai-engine/cycle/persist-summary`, { tenantId }).catch(() => null);
}

export async function cleanupAgentCycle(tenantId: string): Promise<void> {
  assertTenantId(tenantId);
  await fetchAiClient(`/api/ai-engine/cycle/cleanup`, { tenantId }).catch(() => null);
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
    () => fetchAiClient(`/api/ai-engine/cycle/orchestrate`, { tenantId }),
    { failureThreshold: 2, recoveryTimeMs: 60_000 },
  );
  return {
    cycleId: result.cycleId || `cycle_fallback_${Date.now()}`,
    waveCount: result.waveCount ?? 0,
    agentCount: result.agentCount ?? 0,
    totalDiscoveries: result.totalDiscoveries ?? 0,
  };
}
