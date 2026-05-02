// @ts-nocheck
import { logger } from '@dos/platform-core/observability';
// ============================================
// LangGraph Orchestrator Graph
// Coordinates multi-agent execution across all
// 12 AGRC-OS agents (A01-A12) using:
//   - Dependency-based execution waves
//   - Parallel agent execution within waves
//   - Cross-agent discovery correlation
//   - Cycle summary persistence
// ============================================

import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import type { RunnableConfig } from '@langchain/core/runnables';

import {
  type AgentDiscovery,
  type PlatformMode,
} from '../types/agent-state.js';
import { LANGGRAPH_CONFIG, createTracingCallbacks } from '../config/langgraph.config.js';
import { getCheckpointSaver } from '../adapters/checkpoint-factory.js';
import { runSingleAgentGraph } from './single-agent.graph.js';
import { toErrorMessage } from '../../utils/http-error.util.js';
import type { GenericRow as _GenericRow } from '@dos/types';

// ── Per-agent result summary ────────────────────────────────────

interface AgentResult {
  success: boolean;
  discoveryCount: number;
  actionsProposed: number;
  actionsExecuted: number;
  error?: string;
  durationMs: number;
}

interface CorrelationEntry {
  id: string;
  agents: string[];
  pattern: string;
  severity: string;
  description: string;
}

// ── Orchestrator state annotation ───────────────────────────────

const OrchestratorAnnotation = Annotation.Root({
  tenantId: Annotation<string>,
  cycleId: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  platformMode: Annotation<PlatformMode>({
    reducer: (_a, b) => b,
    default: () => 'hybrid' as PlatformMode,
  }),
  waves: Annotation<Array<{ wave: number; agents: string[]; dependenciesMet: boolean }>>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  currentWaveIndex: Annotation<number>({
    reducer: (_a, b) => b,
    default: () => 0,
  }),
  agentResults: Annotation<Record<string, AgentResult>>({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({}),
  }),
  allDiscoveries: Annotation<AgentDiscovery[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  correlations: Annotation<CorrelationEntry[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  shouldContinue: Annotation<boolean>({
    reducer: (_a, b) => b,
    default: () => true,
  }),
  error: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
});

/** Inferred orchestrator state type */
type OrchestratorState = typeof OrchestratorAnnotation.State;

// Re-export for use by activities and workflow
export type { OrchestratorState };

// ── Node implementations ────────────────────────────────────────

/**
 * initCycle — initializes the cooperation cycle context for
 * cross-agent handoffs and discovery tracking.
 */
async function initCycle(state: OrchestratorState): Promise<Partial<OrchestratorState>> {
  try {
    const { initCycleContext } = await import('../../modules/ai/services/agents/agent-cooperation.service.js');

    const { getTenantPlatformMode } = await import('@dos/platform-core/settings/platform-mode-gate.service');

    const ctx = initCycleContext(state.tenantId);
    const mode = await getTenantPlatformMode(state.tenantId);

    return {
      cycleId: ctx.cycleId,
      platformMode: mode,
      agentResults: {},
      allDiscoveries: [],
      correlations: [],
      currentWaveIndex: 0,
      shouldContinue: true,
    };
  } catch (err: unknown) {
    logger.error(`[Orchestrator] initCycle failed: ${toErrorMessage(err)}`);
    return { error: `Cycle init failed: ${toErrorMessage(err)}`, shouldContinue: false };
  }
}

/**
 * computeWaves — computes parallel execution waves from
 * the agent dependency graph. Agents in the same wave
 * can execute concurrently.
 */
async function computeWaves(_state: OrchestratorState): Promise<Partial<OrchestratorState>> {
  try {
    const { computeExecutionWaves } = await import('../../modules/ai/services/agents/agent-cooperation.service.js');
    const waves = computeExecutionWaves();
    return { waves, currentWaveIndex: 0 };
  } catch (err: unknown) {
    logger.error(`[Orchestrator] computeWaves failed: ${toErrorMessage(err)}`);
    return { waves: [], shouldContinue: false, error: toErrorMessage(err) };
  }
}

/**
 * runWave — runs all agents in the current wave concurrently.
 * Uses the LangGraph single-agent graph when enabled, or
 * falls back to the legacy agent-runner service.
 */
async function runWave(state: OrchestratorState): Promise<Partial<OrchestratorState>> {
  const wave = state.waves[state.currentWaveIndex];
  if (!wave) {
    return { shouldContinue: false };
  }

  logger.info(`[Orchestrator] Running wave ${wave.wave}: agents [${wave.agents.join(', ')}]`);

  const waveResults = await Promise.allSettled(
    wave.agents.map(async (agentId: string) => {
      const startMs = Date.now();
      try {
        if (LANGGRAPH_CONFIG.enabled) {
          const result = await runSingleAgentGraph(state.tenantId, agentId, {
            platformMode: state.platformMode,
          });

          return {
            agentId,
            success: !result.error,
            discoveryCount: result.discoveries.length,
            actionsProposed: result.proposedActions.length,
            actionsExecuted: result.executedActions.length,
            discoveries: result.discoveries,
            error: result.error,
            durationMs: Date.now() - startMs,
          };
        } else {
          // Legacy fallback
          const { runAgent } = await import('../../modules/ai/services/agents/core/agent-runner.service.js');
          const result = await runAgent(state.tenantId, agentId);

          return {
            agentId,
            success: result.actionsExecuted > 0 || result.summary !== '',
            discoveryCount: 0,
            actionsProposed: result.actionsProposed,
            actionsExecuted: result.actionsExecuted,
            discoveries: [] as AgentDiscovery[],
            durationMs: result.durationMs,
          };
        }
      } catch (err: unknown) {
        return {
          agentId,
          success: false,
          discoveryCount: 0,
          actionsProposed: 0,
          actionsExecuted: 0,
          discoveries: [] as AgentDiscovery[],
          error: toErrorMessage(err),
          durationMs: Date.now() - startMs,
        };
      }
    }),
  );

  // Aggregate wave results
  const waveAgentResults: Record<string, AgentResult> = {};
  const newDiscoveries: AgentDiscovery[] = [];

  for (const settled of waveResults) {
    if (settled.status === 'fulfilled') {
      const r = settled.value;
      waveAgentResults[r.agentId] = {
        success: r.success,
        discoveryCount: r.discoveryCount,
        actionsProposed: r.actionsProposed,
        actionsExecuted: r.actionsExecuted,
        error: r.error,
        durationMs: r.durationMs,
      };
      if (r.discoveries) {
        newDiscoveries.push(...r.discoveries);
      }
    }
  }

  return {
    agentResults: waveAgentResults,
    allDiscoveries: newDiscoveries,
  };
}

/**
 * advanceWave — increments the wave index and determines
 * whether more waves remain to be processed.
 */
async function advanceWave(state: OrchestratorState): Promise<Partial<OrchestratorState>> {
  const nextIndex = state.currentWaveIndex + 1;
  return {
    currentWaveIndex: nextIndex,
    shouldContinue: nextIndex < state.waves.length,
  };
}

/**
 * correlate — runs cross-agent discovery correlation after
 * all waves have completed.
 */
async function correlate(state: OrchestratorState): Promise<Partial<OrchestratorState>> {
  try {
    const { correlateDiscoveries } = await import('../../modules/ai/services/agents/agent-cooperation.service.js');
    const { detectDiscoveryConflicts, resolveConflicts, persistConflictRecords } = await import(
      '../../modules/ai/services/agent-cooperation/conflict-detection.js'
    );
    const { aggregateFindings, persistSharedFindings } = await import(
      '../../modules/ai/services/agent-cooperation/finding-sharing.js'
    );
    const { runFullCorrelation } = await import(
      '../../modules/ai/services/agent-cooperation/correlation.js'
    );

    // Cast discoveries to cooperation module type (structurally identical)
    const discoveries = state.allDiscoveries as unknown as import('../../modules/ai/services/agent-cooperation/types').AgentDiscovery[];

    // Step 1: Aggregate findings — boost severity when multiple agents corroborate
    const aggregated = aggregateFindings(discoveries);
    logger.info(`[Orchestrator] Aggregated ${state.allDiscoveries.length} discoveries into ${aggregated.length} findings`);

    // Step 2: Detect and resolve conflicts between agent discoveries
    const conflictRecords = detectDiscoveryConflicts(discoveries);
    const resolvedConflicts = resolveConflicts(conflictRecords);
    await persistConflictRecords(state.tenantId, resolvedConflicts);
    const escalatedCount = resolvedConflicts.filter(c => c.resolution === 'escalated').length;
    if (escalatedCount > 0) {
      logger.info(`[Orchestrator] ${escalatedCount} conflicts escalated for human review`);
    }

    // Step 3: Run enhanced correlation patterns (temporal + cascade)
    const enhancedPatterns = runFullCorrelation(discoveries);
    logger.info(`[Orchestrator] Found ${enhancedPatterns.length} correlation patterns`);

    // Step 4: Persist shared findings for cross-cycle learning
    await persistSharedFindings(state.tenantId, aggregated);

    // Step 5: Run legacy correlation (entity convergence + severity cascade + pattern detector)
    const correlations = await correlateDiscoveries(state.tenantId);

    // Combine legacy correlations with enhanced pattern results
    const allCorrelationEntries: CorrelationEntry[] = [
      ...correlations.map((c: { id: string; agents: string[]; pattern: string; severity: string; description: string }) => ({
        id: c.id,
        agents: c.agents,
        pattern: c.pattern,
        severity: c.severity,
        description: c.description,
      })),
      ...enhancedPatterns.map(p => ({
        id: p.patternId,
        agents: [...new Set(p.discoveries.map(d => d.agentId))],
        pattern: `${p.patternType}: ${p.description}`,
        severity: p.confidence >= 0.8 ? 'high' : 'medium',
        description: p.description,
      })),
    ];

    return { correlations: allCorrelationEntries };
  } catch (err: unknown) {
    logger.warn(`[Orchestrator] Correlation failed: ${toErrorMessage(err)}`);
    return { correlations: [] };
  }
}

/**
 * persistSummary — saves the full cycle summary to the database
 * and closes the in-memory cooperation cycle context.
 */
async function persistSummary(state: OrchestratorState): Promise<Partial<OrchestratorState>> {
  try {
    const {
      persistCycleSummary, closeCycleContext,
    } = await import('../../modules/ai/services/agents/agent-cooperation.service.js');

    await persistCycleSummary(state.tenantId);
    closeCycleContext(state.tenantId);

    try {
      const { recordAgentEvent } = await import('../../modules/ai/services/orchestration/agent-orchestration.service.js');
      await recordAgentEvent(state.tenantId, {
        eventType: 'orchestrator_cycle_complete',
        data: {
          cycleId: state.cycleId,
          waveCount: state.waves.length,
          agentCount: Object.keys(state.agentResults).length,
          totalDiscoveries: state.allDiscoveries.length,
          correlationCount: state.correlations.length,
          results: state.agentResults,
        },
      });
    } catch {
      // Event recording is non-fatal
    }
  } catch (err: unknown) {
    logger.warn(`[Orchestrator] persistSummary failed: ${toErrorMessage(err)}`);
  }

  return { shouldContinue: false };
}

// ── Conditional edge router ─────────────────────────────────────

function afterAdvanceWaveRouter(state: OrchestratorState): string {
  if (state.shouldContinue && state.currentWaveIndex < state.waves.length) {
    return 'runWave';
  }
  return 'correlate';
}

// ── Graph factory ───────────────────────────────────────────────

/**
 * Creates and compiles the orchestrator graph that coordinates
 * multi-agent execution across all 12 AGRC-OS agents (A01-A12).
 *
 * Execution flow:
 *   initCycle -> computeWaves -> [runWave -> advanceWave]* -> correlate -> persistSummary -> END
 *
 * @returns Compiled runnable graph
 */
export function createOrchestratorGraph() {
  const graph = new StateGraph(OrchestratorAnnotation)
    .addNode('initCycle', initCycle)
    .addNode('computeWaves', computeWaves)
    .addNode('runWave', runWave)
    .addNode('advanceWave', advanceWave)
    .addNode('correlate', correlate)
    .addNode('persistSummary', persistSummary)
    // Entry
    .addEdge(START, 'initCycle')
    // Linear: initCycle -> computeWaves -> runWave -> advanceWave
    .addEdge('initCycle', 'computeWaves')
    .addEdge('computeWaves', 'runWave')
    .addEdge('runWave', 'advanceWave')
    // Wave loop: advanceWave -> runWave (more waves) or correlate (done)
    .addConditionalEdges('advanceWave', afterAdvanceWaveRouter, {
      runWave: 'runWave',
      correlate: 'correlate',
    })
    // Final steps
    .addEdge('correlate', 'persistSummary')
    .addEdge('persistSummary', END);

  try {
    return graph.compile({ checkpointer: getCheckpointSaver() });
  } catch {
    return graph.compile();
  }
}

/**
 * Run the full orchestrator cycle for a tenant.
 * This is the top-level entry point called by Temporal activities.
 *
 * @param tenantId  Multi-tenant scope
 * @param config    Optional LangGraph runnable config
 * @param temporalWorkflowId  Temporal workflow ID for trace correlation
 * @returns Final orchestrator state
 */
export async function runOrchestratorGraph(
  tenantId: string,
  config?: RunnableConfig,
  temporalWorkflowId?: string,
): Promise<OrchestratorState> {
  const initialState: Partial<OrchestratorState> = {
    tenantId,
    cycleId: '',
    platformMode: 'hybrid',
    waves: [],
    currentWaveIndex: 0,
    agentResults: {},
    allDiscoveries: [],
    correlations: [],
    shouldContinue: true,
    error: '',
  };

  const compiledGraph = createOrchestratorGraph();

  const callbacks = createTracingCallbacks();
  const runnableConfig: RunnableConfig = (config || {
    configurable: {
      thread_id: `${tenantId}:orchestrator:${Date.now().toString(36)}`,
    },
    callbacks: callbacks.length > 0 ? callbacks : undefined,
    tags: [`tenant:${tenantId}`, 'graph:orchestrator'],
    metadata: {
      tenantId,
      temporalWorkflowId,
      graphType: 'orchestrator',
    },
  }) as RunnableConfig;

  const result = await compiledGraph.invoke(initialState, runnableConfig);
  return result;
}
