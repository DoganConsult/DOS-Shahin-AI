// @ts-nocheck
import { logger } from '../../../ports/logger.port.js';
import { eventBus } from '../../../ports/events.port.js';
import { recordAudit } from '../../../../audit/services/audit/core/audit-trail.service.js';
import { recordAgentPerformance, recordAgentRun as recordAgentRunMetric } from '../../../ports/platform.port.js';
import { completeHandoff, correlateDiscoveries, } from '../agent-cooperation.service.js';
import { runAgentWithTools, getToolsForAgent } from './agent-tool-executor.service.js';
import { updateAgentRun, recordAgentEvent, } from '../../orchestration/agent-orchestration.service.js';
import { _fallbackAgentResponse } from './agent-fallback-responses.service.js';
import { toErrorMessage } from '@dos/module-sdk';
import { LANGGRAPH_CONFIG } from '../../../../../langgraph/config/langgraph.config.js';
import { runSingleAgentGraph } from '../../../../../langgraph/graphs/single-agent.graph.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
// ── Helper: complete handoffs (both in-memory and DB-backed) ──────────────────
async function completeAllHandoffs(tenantId, agentId, pendingHandoffs, dbHandoffs, actionsExecuted) {
    for (const h of pendingHandoffs) {
        completeHandoff(tenantId, h.id, { processedBy: agentId, actionsGenerated: actionsExecuted });
    }
    for (const h of dbHandoffs) {
        try {
            const { completePersistentHandoff } = await import('../../../../agrc-engine/services/agrc-os-integration.service.js');
            await completePersistentHandoff(tenantId, h.id, { processedBy: agentId, actionsGenerated: actionsExecuted });
        }
        catch { /* non-fatal */ }
    }
}
// ── Helper: post-run memory + eval ──────────────────────────────────────────
async function postRunMemoryAndEval(tenantId, agentId, runId, actionsProposed, actionsExecuted, durationMs, summary, mode, enrichedContext, discoveryCount) {
    try {
        const { writeSharedMemory } = await import('../../memory/shared-agent-memory.service.js');
        await writeSharedMemory(tenantId, agentId, 'agent_runs', `${agentId}: ${summary} (proposed=${actionsProposed}, executed=${actionsExecuted})`, { runId, agentId, actionsProposed, actionsExecuted, discoveryCount, durationMs, mode }, actionsExecuted > 0 ? 0.7 : 0.4);
    }
    catch { /* shared memory non-fatal */ }
    try {
        const { recordCycleFinding } = await import('../../orchestration/agent-cycle-memory.service.js');
        const cycleId = runId || `cycle-${new Date().toISOString().split('T')[0]}`;
        await recordCycleFinding(tenantId, cycleId, agentId, `${agentId} ${mode} run: ${summary}`, 'cycle_finding', { actionsProposed, actionsExecuted, discoveryCount, durationMs, mode });
    }
    catch { /* cycle memory non-fatal */ }
    try {
        const { evaluateOutput } = await import('../agent-eval.service.js');
        const inputSample = JSON.stringify(enrichedContext).slice(0, 1000);
        swallow(EC.AGENT_ACTION, evaluateOutput(tenantId, agentId, inputSample, summary, 'quality', runId || undefined), { tenantId, agentId, operation: 'evaluateOutput' });
    }
    catch { /* eval non-fatal */ }
}
// ── Helper: cross-agent correlation ──────────────────────────────────────────
async function runCorrelation(tenantId, agentId, runId, discoveries, idPrefix) {
    if (!discoveries.length)
        return;
    try {
        const cooperationDiscoveries = discoveries.map((d, idx) => {
            const payload = (typeof d.payload === 'object' && d.payload !== null ? d.payload : {});
            return {
                id: `${idPrefix}-${runId || 'none'}-${idx}`,
                agentId,
                type: (d.type === 'risk' ? 'risk' : d.type === 'gap' ? 'gap' : d.type === 'violation' ? 'violation' : 'anomaly'),
                severity: ((d.severity === 'info' ? 'low' : d.severity) || payload.severity || 'medium'),
                entityType: (d.relatedEntityType || payload.entityType || d.type || 'any'),
                entityId: (d.relatedEntityId || payload.entityId || payload.riskId || payload.vendorId || payload.controlId),
                title: d.summary || d.type || 'Discovery',
                details: d.metadata ? JSON.stringify(d.metadata) : (typeof d.payload === 'string' ? d.payload : JSON.stringify(d.payload)),
                timestamp: new Date().toISOString(),
            };
        });
        const correlations = await correlateDiscoveries(tenantId, agentId, cooperationDiscoveries);
        if (correlations.length > 0) {
            logger.info(`[AgentRunner] ${agentId} found ${correlations.length} cross-agent correlations`);
            swallow(EC.EVENT_BUS, eventBus.publish({
                eventType: 'ai.correlation.detected',
                tenantId,
                sourceService: 'agent-runner',
                severity: 'info',
                payload: { agentId, runId, correlationCount: correlations.length, correlations: correlations.map(c => ({ id: c.id, pattern: c.pattern, agents: c.agents })) },
            }), { tenantId, agentId, operation: 'eventBus:ai.correlation.detected' });
        }
    }
    catch (corrErr) {
        logger.warn(`[AgentRunner] ${agentId} correlation check failed: ${toErrorMessage(corrErr)}`);
    }
}
// ══════════════════════════════════════════════════════════════════════════════
// PRIMARY PATH: LangGraph execution
// ══════════════════════════════════════════════════════════════════════════════
export async function executeLangGraphPath(input) {
    if (!LANGGRAPH_CONFIG.enabled)
        return null;
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
        eventBus.publish({ eventType: 'ai.run.completed', tenantId, sourceService: 'agent-runner', severity: 'info', payload: { agentId, runId, durationMs, actionsProposed, actionsExecuted, discoveryCount, mode: 'langgraph' } });
        return { agentId, tenantId, actionsProposed, actionsExecuted, summary, durationMs };
    }
    catch (lgErr) {
        const errorMsg = toErrorMessage(lgErr);
        const errorStack = lgErr instanceof Error ? lgErr.stack : undefined;
        logger.warn(`[AgentRunner] ${agentId} LangGraph failed, falling back to tool executor`, {
            tenantId, runId: runId || 'none', error: errorMsg, stack: errorStack, fallbackMode: 'tool_executor',
        });
        eventBus.publish({ eventType: 'ai.langgraph.fallback', tenantId, sourceService: 'agent-runner', severity: 'warning', payload: { agentId, runId, error: errorMsg, stack: errorStack } });
        return null; // Signal fallback
    }
}
// ══════════════════════════════════════════════════════════════════════════════
// SECONDARY PATH: Tool executor
// ══════════════════════════════════════════════════════════════════════════════
export async function executeToolExecutorPath(input) {
    const { tenantId, agentId, enrichedContext, pendingHandoffs, dbHandoffs, runId, platformModeEarly } = input;
    const registeredTools = getToolsForAgent(agentId);
    if (registeredTools.length === 0)
        return null;
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
        eventBus.publish({ eventType: 'ai.run.completed', tenantId, sourceService: 'agent-runner', severity: 'info', payload: { agentId, runId, durationMs, actionsProposed, actionsExecuted } });
        return { agentId, tenantId, actionsProposed, actionsExecuted, summary, durationMs };
    }
    catch (toolErr) {
        eventBus.publish({ eventType: 'ai.run.failed', tenantId, sourceService: 'agent-runner', severity: 'warning', payload: { agentId, runId, error: toErrorMessage(toolErr) } });
        const { escalateFailedRun } = await import('./ai-agent-runtime.service.js');
        swallow(EC.AGENT_ACTION, escalateFailedRun(tenantId, runId || '', agentId), { tenantId, agentId, operation: 'escalateFailedRun' });
        logger.warn(`[AgentRunner] ${agentId} tool executor failed, falling back to legacy: ${toErrorMessage(toolErr)}`);
        return null; // Signal fallback
    }
}
// ══════════════════════════════════════════════════════════════════════════════
// LEGACY FALLBACK PATH: Single-shot claudeJSON
// ══════════════════════════════════════════════════════════════════════════════
export async function executeLegacyPath(input) {
    const toolResult = await executeToolExecutorPath(input);
    if (toolResult)
        return toolResult;
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
//# sourceMappingURL=agent-runner-llm.service.js.map