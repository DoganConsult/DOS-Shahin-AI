// @ts-nocheck
import { logger } from '../../../ports/logger.port';
/**
 * Agent Runner LLM Service
 *
 * Handles all three LLM execution paths:
 *   1. PRIMARY: LangGraph 8-node StateGraph
 *   2. SECONDARY: Multi-step tool executor
 *   3. LEGACY: Single-shot claudeJSON fallback
 *
 * Also handles post-execution bookkeeping (handoffs, audit, memory, correlation).
 */

import { emptyResult, safeQuery, tenantSchema as _tenantSchema } from '../../../ports/database.port';
import { gatewayJSON } from '../../gateway/ai-gateway.service';
import { eventBus } from '../../../ports/events.port';
import { recordAudit } from '../../../../audit/services/audit/core/audit-trail.service';

import { recordAgentPerformance, recordAgentRun as recordAgentRunMetric } from '../../../ports/platform.port';
import { aiCircuitBreaker } from '../../governance/circuit/ai-circuit-breaker.service';
import {
  registerDiscovery,
  completeHandoff, correlateDiscoveries,
} from '../agent-cooperation.service.js';
import { runAgentWithTools, getToolsForAgent } from './agent-tool-executor.service';
import {
  getTenantPlatformMode, getAgentPlatformMode, getModeDirective, gateActionWithPolicy, queuePendingAction,
  logModeOperation, type PlatformMode, type ActionPriority,
} from '../../../ports/platform.port';
import {
  updateAgentRun, recordAgentStep, recordAgentEvent,
  createProposal, mapModeToAutonomy,
} from '../../orchestration/agent-orchestration.service';
import { executeAction, resolveUserPermissions, getDefaultAgentPermissions } from '../../orchestration/agent-action-executor.service';
import { _fallbackAgentResponse } from './agent-fallback-responses.service';
import { toErrorMessage } from '@dos/module-sdk';
import { LANGGRAPH_CONFIG } from '../../../../../langgraph/config/langgraph.config';
import { runSingleAgentGraph } from '../../../../../langgraph/graphs/single-agent.graph';
import type { AgentAction, AgentRunResult } from './agent-runner.types';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
import type { GenericRow as _GenericRow } from '../../../ports/platform.port';

// ── Shared types for internal communication ──────────────────────────────────

interface _HandoffItem {
  id: string;
  from: string;
  type: string;
  priority: string;
  finding: any;
  requestedAction: any;
  source: 'memory' | 'db';
}

interface PendingHandoff {
  id: string;
  fromAgent: string;
  handoffType: string;
  priority: string;
  payload?: Record<string, unknown>;
}

type DbHandoff = Record<string, unknown>;

interface TemporalContext {
  previousCycleFindings?: Array<{ content: string; memory_type: string; created_at: string }>;
  openProcessTasks?: Array<{ task_id: string; title: string; task_type: string; priority: string; due_date?: string }>;
  recentObservations?: Array<{ title: string; description?: string; severity: string; created_at: string }>;
}

interface LlmExecutionInput {
  tenantId: string;
  agentId: string;
  schema: string;
  agentDef: Record<string, unknown>;
  enrichedContext: Record<string, unknown>;
  pendingHandoffs: PendingHandoff[];
  dbHandoffs: DbHandoff[];
  runId: string | null;
  startMs: number;
  platformModeEarly: PlatformMode;
  _memoryContext: Array<{ memory_type: string; content: string; importance_score: number }>;
  _temporalContext: TemporalContext;
  _ragContext: string;
  opts?: {
    callerAgentId?: string;
  };
}

// ── Helper: complete handoffs (both in-memory and DB-backed) ──────────────────

async function completeAllHandoffs(
  tenantId: string,
  agentId: string,
  pendingHandoffs: PendingHandoff[],
  dbHandoffs: DbHandoff[],
  actionsExecuted: number,
): Promise<void> {
  for (const h of pendingHandoffs) {
    completeHandoff(tenantId, h.id, { processedBy: agentId, actionsGenerated: actionsExecuted });
  }
  for (const h of dbHandoffs) {
    try {
      const { completePersistentHandoff } = await import('../../../../agrc-engine/services/agrc-os-integration.service');
      await completePersistentHandoff(tenantId, h.id as string, { processedBy: agentId, actionsGenerated: actionsExecuted });
    } catch { /* non-fatal */ }
  }
}

// ── Helper: post-run memory + eval ──────────────────────────────────────────

async function postRunMemoryAndEval(
  tenantId: string,
  agentId: string,
  runId: string | null,
  actionsProposed: number,
  actionsExecuted: number,
  durationMs: number,
  summary: string,
  mode: string,
  enrichedContext: Record<string, unknown>,
  discoveryCount?: number,
): Promise<void> {
  try {
    const { writeSharedMemory } = await import('../../memory/shared-agent-memory.service');
    await writeSharedMemory(tenantId, agentId, 'agent_runs',
      `${agentId}: ${summary} (proposed=${actionsProposed}, executed=${actionsExecuted})`,
      { runId, agentId, actionsProposed, actionsExecuted, discoveryCount, durationMs, mode },
      actionsExecuted > 0 ? 0.7 : 0.4);
  } catch { /* shared memory non-fatal */ }

  try {
    const { recordCycleFinding } = await import('../../orchestration/agent-cycle-memory.service');
    const cycleId = runId || `cycle-${new Date().toISOString().split('T')[0]}`;
    await recordCycleFinding(tenantId, cycleId, agentId,
      `${agentId} ${mode} run: ${summary}`, 'cycle_finding',
      { actionsProposed, actionsExecuted, discoveryCount, durationMs, mode });
  } catch { /* cycle memory non-fatal */ }

  try {
    const { evaluateOutput } = await import('../agent-eval.service');
    const inputSample = JSON.stringify(enrichedContext).slice(0, 1000);
    swallow(EC.AGENT_ACTION, evaluateOutput(tenantId, agentId, inputSample, summary, 'quality', runId || undefined), { tenantId, agentId, operation: 'evaluateOutput' });
  } catch { /* eval non-fatal */ }
}

// ── Helper: cross-agent correlation ──────────────────────────────────────────

async function runCorrelation(
  tenantId: string,
  agentId: string,
  runId: string | null,
  discoveries: Array<{ type: string; severity?: string; summary?: string; relatedEntityType?: string; relatedEntityId?: string; metadata?: any; payload?: any }>,
  idPrefix: string,
): Promise<void> {
  if (!discoveries.length) return;
  try {
    const cooperationDiscoveries: Array<{
      id: string; agentId: string;
      type: 'risk' | 'gap' | 'violation' | 'anomaly' | 'recommendation';
      severity: 'critical' | 'high' | 'medium' | 'low';
      entityType: string; entityId?: string;
      title: string; details: string; timestamp: string;
    }> = discoveries.map((d, idx) => {
      const payload = (typeof d.payload === 'object' && d.payload !== null ? d.payload : {}) as Record<string, unknown>;
      return {
        id: `${idPrefix}-${runId || 'none'}-${idx}`,
        agentId,
        type: (d.type === 'risk' ? 'risk' : d.type === 'gap' ? 'gap' : d.type === 'violation' ? 'violation' : 'anomaly') as 'risk' | 'gap' | 'violation' | 'anomaly' | 'recommendation',
        severity: ((d.severity === 'info' ? 'low' : d.severity) || (payload.severity as string) || 'medium') as 'critical' | 'high' | 'medium' | 'low',
        entityType: (d.relatedEntityType || (payload.entityType as string) || d.type || 'any') as string,
        entityId: (d.relatedEntityId || (payload.entityId as string) || (payload.riskId as string) || (payload.vendorId as string) || (payload.controlId as string)) as string | undefined,
        title: d.summary || d.type || 'Discovery',
        details: d.metadata ? JSON.stringify(d.metadata) : (typeof d.payload === 'string' ? d.payload : JSON.stringify(d.payload)),
        timestamp: new Date().toISOString(),
      };
    });

    const correlations = await correlateDiscoveries(tenantId, agentId, cooperationDiscoveries);
    if (correlations.length > 0) {
      logger.info(`[AgentRunner] ${agentId} found ${correlations.length} cross-agent correlations`);
      swallow(EC.EVENT_BUS, eventBus.publish(({
              eventType: 'ai.correlation.detected',
              tenantId,
              sourceService: 'agent-runner',
              severity: 'info',
              payload: { agentId, runId, correlationCount: correlations.length, correlations: correlations.map(c => ({ id: c.id, pattern: c.pattern, agents: c.agents })) },
            } as any)), { tenantId, agentId, operation: 'eventBus:ai.correlation.detected' });
    }
  } catch (corrErr: unknown) {
    logger.warn(`[AgentRunner] ${agentId} correlation check failed: ${toErrorMessage(corrErr)}`);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PRIMARY PATH: LangGraph execution
// ══════════════════════════════════════════════════════════════════════════════

export async function executeLangGraphPath(input: LlmExecutionInput): Promise<AgentRunResult | null> {
  if (!LANGGRAPH_CONFIG.enabled) return null;

  const { tenantId, agentId, enrichedContext, pendingHandoffs, dbHandoffs, runId, platformModeEarly } = input;
  let actionsProposed = 0;
  let actionsExecuted = 0;
  let tokensUsed = 0;

  try {
    const lgStart = Date.now();
    logger.info(`[AgentRunner] ${agentId} (tenant: ${tenantId}) starting LangGraph execution`, {
      runId: runId || 'none',
      platformMode: platformModeEarly,
      checkpointEnabled: true,
    });

    const graphResult = await runSingleAgentGraph(tenantId, agentId, {
      runId: runId || undefined,
      platformMode: platformModeEarly,
    });

    const durationMs = Date.now() - lgStart;
    actionsProposed = graphResult.proposedActions.length + graphResult.executedActions.length;
    actionsExecuted = graphResult.executedActions.length;
    const discoveryCount = graphResult.discoveries.length;
    let summary = `[LangGraph] ${agentId}: ${discoveryCount} discoveries, ${actionsProposed} proposed, ${actionsExecuted} executed`;

    logger.info(`[AgentRunner] ${agentId} LangGraph execution completed`, {
      tenantId, runId: runId || 'none', durationMs, discoveryCount,
      actionsProposed, actionsExecuted, hasError: !!graphResult.error,
    });

    if (graphResult.error) {
      summary += ` (warning: ${graphResult.error})`;
      logger.warn(`[AgentRunner] ${agentId} LangGraph execution had warning`, {
        tenantId, runId: runId || 'none', error: graphResult.error,
      });
    }

    await completeAllHandoffs(tenantId, agentId, pendingHandoffs, dbHandoffs, actionsExecuted);
    swallow(EC.AGENT_ACTION, recordAgentPerformance(agentId, 'langgraph_run', tenantId, durationMs, true), { tenantId, agentId, operation: 'recordAgentPerformance:langgraph_run' });

    if (runId) {
      swallow(EC.AGENT_ACTION, updateAgentRun(tenantId, runId, {
        status: 'completed', summary, actionsProposed, actionsExecuted,
        actionsQueued: actionsProposed - actionsExecuted, durationMs, tokensUsed,
      }), { tenantId, agentId, operation: 'updateAgentRun:completed' });
      recordAgentRunMetric(agentId, 'completed', durationMs, tokensUsed);
      swallow(EC.AGENT_ACTION, recordAgentEvent(tenantId, {
        runId, agentId, eventType: 'run.completed',
        data: { actionsProposed, actionsExecuted, discoveryCount, summary, durationMs, mode: 'langgraph' },
      }), { tenantId, agentId, operation: 'recordAgentEvent:run.completed' });
    }

    if (actionsExecuted > 0) {
      swallow(EC.AGENT_ACTION, recordAudit({
        tenantId, userId: `agent-${agentId}`, module: 'agent_runner',
        action: 'create', entityType: 'agent_run', entityId: agentId,
        afterState: { actionsProposed, actionsExecuted, discoveryCount, summary, mode: 'langgraph', runId },
      }), { tenantId, agentId, operation: 'recordAudit:agent_run_langgraph' });
    }

    if (actionsExecuted > 0 || actionsProposed > 0) {
      await postRunMemoryAndEval(tenantId, agentId, runId, actionsProposed, actionsExecuted, durationMs, summary, 'langgraph', enrichedContext, discoveryCount);
    }

    if (graphResult.discoveries.length > 0) {
      await runCorrelation(tenantId, agentId, runId, graphResult.discoveries, 'lg');
    }

    eventBus.publish(({ eventType: 'ai.run.completed', tenantId, sourceService: 'agent-runner', severity: 'info', payload: { agentId, runId, durationMs, actionsProposed, actionsExecuted, discoveryCount, mode: 'langgraph' } } as any));
    return { agentId, tenantId, actionsProposed, actionsExecuted, summary, durationMs };
  } catch (lgErr: unknown) {
    const errorMsg = toErrorMessage(lgErr);
    const errorStack = lgErr instanceof Error ? lgErr.stack : undefined;
    logger.warn(`[AgentRunner] ${agentId} LangGraph failed, falling back to tool executor`, {
      tenantId, runId: runId || 'none', error: errorMsg, stack: errorStack, fallbackMode: 'tool_executor',
    });
    eventBus.publish(({ eventType: 'ai.langgraph.fallback', tenantId, sourceService: 'agent-runner', severity: 'warning', payload: { agentId, runId, error: errorMsg, stack: errorStack } } as any));
    return null; // Signal fallback
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// SECONDARY PATH: Tool executor
// ══════════════════════════════════════════════════════════════════════════════

export async function executeToolExecutorPath(input: LlmExecutionInput): Promise<AgentRunResult | null> {
  const { tenantId, agentId, enrichedContext, pendingHandoffs, dbHandoffs, runId, platformModeEarly } = input;

  const registeredTools = getToolsForAgent(agentId);
  if (registeredTools.length === 0) return null;

  try {
    const toolStart = Date.now();
    const langgraphWasEnabled = LANGGRAPH_CONFIG.enabled;
    logger.info(`[AgentRunner] ${agentId} (tenant: ${tenantId}) starting tool executor execution`, {
      runId: runId || 'none', platformMode: platformModeEarly,
      toolCount: registeredTools.length, langgraphEnabled: langgraphWasEnabled,
      executionMode: langgraphWasEnabled ? 'fallback' : 'primary',
    });

    const toolResult = await runAgentWithTools(tenantId, agentId, enrichedContext);
    const durationMs = Date.now() - toolStart;
    const actionsProposed = toolResult.totalToolCalls;
    const actionsExecuted = toolResult.toolResults.filter(r => !r.isError).length;
    const _tokensUsed = (toolResult.totalInputTokens || 0) + (toolResult.totalOutputTokens || 0);
    const summary = toolResult.finalText || `Tool-based run: ${actionsExecuted}/${actionsProposed} tool calls succeeded`;

    logger.info(`[AgentRunner] ${agentId} tool executor execution completed`, {
      tenantId, runId: runId || 'none', durationMs, actionsProposed, actionsExecuted,
      toolCallCount: toolResult.totalToolCalls,
      executionMode: langgraphWasEnabled ? 'fallback' : 'primary',
    });

    await completeAllHandoffs(tenantId, agentId, pendingHandoffs, dbHandoffs, actionsExecuted);
    swallow(EC.AGENT_ACTION, recordAgentPerformance(agentId, 'autonomous_tool_run', tenantId, durationMs, true), { tenantId, agentId, operation: 'recordAgentPerformance:tool_run' });

    if (actionsExecuted > 0) {
      swallow(EC.AGENT_ACTION, recordAudit({
        tenantId, userId: `agent-${agentId}`, module: 'agent_runner',
        action: 'create', entityType: 'agent_run', entityId: agentId,
        afterState: { actionsProposed, actionsExecuted, summary, mode: 'tool_executor', steps: toolResult.steps },
      }), { tenantId, agentId, operation: 'recordAudit:agent_run_tool_executor' });
    }

    if (actionsExecuted > 0 || actionsProposed > 0) {
      await postRunMemoryAndEval(tenantId, agentId, runId, actionsProposed, actionsExecuted, durationMs, summary, 'tool_executor', enrichedContext);
    }

    if (toolResult.discoveries && toolResult.discoveries.length > 0) {
      await runCorrelation(tenantId, agentId, runId, toolResult.discoveries, 'tool');
    }

    eventBus.publish(({ eventType: 'ai.run.completed', tenantId, sourceService: 'agent-runner', severity: 'info', payload: { agentId, runId, durationMs, actionsProposed, actionsExecuted } } as any));
    return { agentId, tenantId, actionsProposed, actionsExecuted, summary, durationMs };
  } catch (toolErr: unknown) {
    eventBus.publish(({ eventType: 'ai.run.failed', tenantId, sourceService: 'agent-runner', severity: 'warning', payload: { agentId, runId, error: toErrorMessage(toolErr) } } as any));
    const { escalateFailedRun } = await import('./ai-agent-runtime.service');
    swallow(EC.AGENT_ACTION, escalateFailedRun(tenantId, runId || '', agentId), { tenantId, agentId, operation: 'escalateFailedRun' });
    logger.warn(`[AgentRunner] ${agentId} tool executor failed, falling back to legacy: ${toErrorMessage(toolErr)}`);
    return null; // Signal fallback
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// LEGACY FALLBACK PATH: Single-shot claudeJSON
// ══════════════════════════════════════════════════════════════════════════════

export async function executeLegacyPath(input: LlmExecutionInput): Promise<AgentRunResult> {
  const toolResult = await executeToolExecutorPath(input);
  if (toolResult) return toolResult;
  const fallback = _fallbackAgentResponse(input.agentId, input.context);
  return {
    agentId: input.agentId,
    tenantId: input.tenantId,
    actionsProposed: fallback.actions,
    actionsExecuted: [],
    summary: fallback.summary,
    durationMs: 0,
  };
}
