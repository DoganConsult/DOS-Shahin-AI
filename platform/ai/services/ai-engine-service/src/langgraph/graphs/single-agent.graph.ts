// @ts-nocheck
/**
 * Single Agent Graph — LangGraph StateGraph execution engine.
 *
 * Uses LangGraph StateGraph with:
 *   - Model adapter (multi-tier routing: Haiku/Sonnet/Opus with fallback)
 *   - Checkpoint persistence (PostgreSQL via checkpoint-factory)
 *   - Tool adapter (JSON Schema → Zod → DynamicStructuredTool)
 *   - Metrics callback (Langfuse + PostgreSQL dual-write)
 *
 * Execution loop:
 *   1. Load agent definition and tools from DB
 *   2. Build LangGraph StateGraph with model + tools
 *   3. Execute graph with checkpoint persistence
 *   4. Collect metrics and return results
 *
 * Falls back to direct callClaude() loop if LangGraph deps are unavailable.
 */

import { LANGGRAPH_CONFIG, createMetricsCallback } from '../config/langgraph.config';
import { logger } from '@dos/platform-core/observability';
import { toErrorMessage } from '@dos/platform-core/resilience';

export interface SingleAgentGraphResult {
  discoveries: Array<{ type: string; detail: string; confidence: number }>;
  proposedActions: Array<{ type: string; target: string; detail: string }>;
  executedActions: Array<{ type: string; target: string; result: string }>;
  summary: string;
  tokensUsed: number;
  iterationCount: number;
  error?: string;
  langfuseTraceId?: string;
}

export async function runSingleAgentGraph(
  tenantId: string,
  agentId: string,
  opts: {
    runId?: string;
    platformMode?: string;
    context?: Record<string, unknown>;
    maxIterations?: number;
  } = {},
): Promise<SingleAgentGraphResult> {
  const runId = opts.runId || crypto.randomUUID();

  // Try LangGraph StateGraph path first
  if (LANGGRAPH_CONFIG.enabled) {
    try {
      return await runWithStateGraph(tenantId, agentId, runId, opts);
    } catch (err: unknown) {
      logger.warn(`[SingleAgentGraph] StateGraph failed, falling back to direct loop: ${toErrorMessage(err)}`);
    }
  }

  // Fallback: direct Claude loop (no LangGraph dependency)
  return runWithDirectLoop(tenantId, agentId, runId, opts);
}

/**
 * LangGraph StateGraph execution path.
 * Uses adapters for model routing, checkpoint persistence, and tool binding.
 */
async function runWithStateGraph(
  tenantId: string,
  agentId: string,
  runId: string,
  opts: {
    platformMode?: string;
    context?: Record<string, unknown>;
    maxIterations?: number;
  },
): Promise<SingleAgentGraphResult> {
  const { StateGraph, END } = await import('@langchain/langgraph');
  const { HumanMessage, SystemMessage } = await import('@langchain/core/messages');
  const { getChatModel } = await import('../adapters/model-adapter');
  const { getCheckpointSaver } = await import('../adapters/checkpoint-factory');
  const { safeQuery, tenantSchema } = await import('@dos/db');

  const maxIter = opts.maxIterations || LANGGRAPH_CONFIG.maxToolIterations || 5;
  const schema = tenantSchema(tenantId);

  // Start metrics tracking
  const metricsCallback = createMetricsCallback(runId, agentId, tenantId, 'single-agent');

  // Load agent definition
  const agentRow = await safeQuery(
    `SELECT agent_id, display_name, system_prompt, tools, domain, specialization
     FROM "${schema}".actor_registry
     WHERE actor_id = $1 AND actor_type != 'human'
     LIMIT 1`,
    [agentId],
  ).catch(() => ({ rows: [] }));

  const agent = agentRow.rows[0];
  const agentName = agent?.display_name || agentId;
  const systemPrompt = agent?.system_prompt ||
    `You are ${agentName}, an AI agent in a GRC platform. Analyze data, identify issues, and propose actions.
Respond with JSON: { discoveries: [{type, detail, confidence}], proposedActions: [{type, target, detail}], summary: string, done: boolean }`;

  // Load tools if available
  let tools: any[] = [];
  try {
    const { convertAllTools } = await import('../adapters/tool-adapter');
    const { getToolsForAgent } = await import('../../runtime/ai/services/agents/core/agent-tools-registry.service');
    const agentTools = await getToolsForAgent(tenantId, agentId);
    tools = convertAllTools(agentTools, tenantId);
  } catch {
    // No tools available — agent will operate in analysis-only mode
  }

  // Build model with tools
  const model = getChatModel({ temperature: 0.2, maxTokens: 2048 });
  const boundModel = tools.length > 0 ? model.bindTools(tools) : model;

  // Load context
  const contextRows = await safeQuery(
    `SELECT signal_type, value, metadata, created_at
     FROM "${schema}".ai_signals
     WHERE created_at > NOW() - INTERVAL '24 hours'
     ORDER BY created_at DESC LIMIT 20`,
  ).catch(() => ({ rows: [] }));

  const contextSummary = contextRows.rows.length > 0
    ? `Recent signals (24h): ${JSON.stringify(contextRows.rows.slice(0, 10))}`
    : 'No recent signals available.';

  // Define graph state
  interface AgentState {
    messages: any[];
    discoveries: Array<{ type: string; detail: string; confidence: number }>;
    proposedActions: Array<{ type: string; target: string; detail: string }>;
    executedActions: Array<{ type: string; target: string; result: string }>;
    summary: string;
    tokensUsed: number;
    iterationCount: number;
    done: boolean;
  }

  // Build StateGraph
  const graph = new StateGraph<AgentState>({
    channels: {
      messages: { default: () => [] },
      discoveries: { default: () => [] },
      proposedActions: { default: () => [] },
      executedActions: { default: () => [] },
      summary: { default: () => '' },
      tokensUsed: { default: () => 0 },
      iterationCount: { default: () => 0 },
      done: { default: () => false },
    },
  })
    .addNode('agent', async (state: AgentState) => {
      const response = await boundModel.invoke(state.messages);
      const inputTokens = (response as any)?.usage_metadata?.input_tokens ?? 0;
      const outputTokens = (response as any)?.usage_metadata?.output_tokens ?? 0;

      // Parse structured output
      const content = typeof response.content === 'string' ? response.content : JSON.stringify(response.content);
      let parsed: any = {};
      try {
        let jsonStr = content;
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
        parsed = JSON.parse(jsonStr);
      } catch {
        parsed = { summary: content.slice(0, 500), done: true };
      }

      return {
        messages: [...state.messages, response],
        discoveries: [...state.discoveries, ...(parsed.discoveries || [])],
        proposedActions: [...state.proposedActions, ...(parsed.proposedActions || [])],
        summary: parsed.summary || state.summary,
        tokensUsed: state.tokensUsed + inputTokens + outputTokens,
        iterationCount: state.iterationCount + 1,
        done: parsed.done === true || state.iterationCount + 1 >= maxIter,
      };
    })
    .addEdge('__start__', 'agent')
    .addConditionalEdges('agent', (state: AgentState) => {
      return state.done ? END : 'agent';
    });

  // Compile with checkpoint persistence
  const checkpointSaver = getCheckpointSaver();
  const compiledGraph = graph.compile({ checkpointer: checkpointSaver });

  // Execute
  const initialState: AgentState = {
    messages: [
      new SystemMessage(systemPrompt),
      new HumanMessage(`Tenant: ${tenantId}. Mode: ${opts.platformMode || 'standard'}.\n${contextSummary}\nAnalyze and respond with JSON.`),
    ],
    discoveries: [],
    proposedActions: [],
    executedActions: [],
    summary: '',
    tokensUsed: 0,
    iterationCount: 0,
    done: false,
  };

  const callbacks = metricsCallback ? [metricsCallback] : [];
  const finalState = await compiledGraph.invoke(initialState, {
    configurable: {
      thread_id: runId,
      tenant_id: tenantId,
    },
    callbacks,
  });

  // Finalize metrics
  if (metricsCallback && typeof (metricsCallback as any).finalize === 'function') {
    await (metricsCallback as any).finalize('success');
  }

  return {
    discoveries: finalState.discoveries || [],
    proposedActions: finalState.proposedActions || [],
    executedActions: finalState.executedActions || [],
    summary: finalState.summary || `Agent ${agentName} completed ${finalState.iterationCount} iterations.`,
    tokensUsed: finalState.tokensUsed || 0,
    iterationCount: finalState.iterationCount || 0,
  };
}

/**
 * Direct Claude loop fallback (no LangGraph dependency).
 * Used when LANGGRAPH_AGENTS_ENABLED=false or StateGraph fails.
 */
async function runWithDirectLoop(
  tenantId: string,
  agentId: string,
  runId: string,
  opts: {
    platformMode?: string;
    context?: Record<string, unknown>;
    maxIterations?: number;
  },
): Promise<SingleAgentGraphResult> {
  const maxIter = opts.maxIterations || LANGGRAPH_CONFIG.maxToolIterations || 5;
  const result: SingleAgentGraphResult = {
    discoveries: [],
    proposedActions: [],
    executedActions: [],
    summary: '',
    tokensUsed: 0,
    iterationCount: 0,
  };

  try {
    const { callClaude } = await import('../../config/claude-client');
    const { safeQuery, tenantSchema } = await import('@dos/db');
    const schema = tenantSchema(tenantId);

    const agentRow = await safeQuery(
      `SELECT agent_id, display_name, system_prompt, tools, domain, specialization
       FROM "${schema}".actor_registry
       WHERE actor_id = $1 AND actor_type != 'human'
       LIMIT 1`,
      [agentId],
    ).catch(() => ({ rows: [] }));

    const agent = agentRow.rows[0];
    const agentName = agent?.display_name || agentId;
    const systemPrompt = agent?.system_prompt ||
      `You are ${agentName}, an AI agent in a GRC platform.
Analyze data, identify issues, and propose actions.
Respond with JSON: { discoveries: [{type, detail, confidence}], proposedActions: [{type, target, detail}], summary, done }`;

    const contextRows = await safeQuery(
      `SELECT signal_type, value, metadata, created_at
       FROM "${schema}".ai_signals
       WHERE created_at > NOW() - INTERVAL '24 hours'
       ORDER BY created_at DESC LIMIT 20`,
    ).catch(() => ({ rows: [] }));

    const contextSummary = contextRows.rows.length > 0
      ? `Recent signals (24h): ${JSON.stringify(contextRows.rows.slice(0, 10))}`
      : 'No recent signals available.';

    for (let i = 0; i < maxIter; i++) {
      result.iterationCount = i + 1;

      const response = await callClaude({
        systemPrompt,
        userMessage: `Iteration ${i + 1}/${maxIter}. Tenant: ${tenantId}. Mode: ${opts.platformMode || 'standard'}.
${contextSummary}
${i > 0 ? `Previous findings: ${JSON.stringify(result.discoveries)}` : 'This is your first analysis pass.'}
Analyze and respond with JSON.`,
        model: LANGGRAPH_CONFIG.defaultModel,
        maxTokens: 2048,
        temperature: 0.2,
      });

      result.tokensUsed += (response.inputTokens || 0) + (response.outputTokens || 0);

      try {
        let jsonStr = response.content || '{}';
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
        const parsed = JSON.parse(jsonStr);

        if (parsed.discoveries) result.discoveries.push(...(Array.isArray(parsed.discoveries) ? parsed.discoveries : []));
        if (parsed.proposedActions) result.proposedActions.push(...(Array.isArray(parsed.proposedActions) ? parsed.proposedActions : []));
        if (parsed.summary) result.summary = parsed.summary;
        if (parsed.done || (i > 0 && !parsed.discoveries?.length && !parsed.proposedActions?.length)) break;
      } catch {
        result.summary = response.content?.slice(0, 500) || 'Agent produced non-JSON response';
        break;
      }
    }

    if (!result.summary) {
      result.summary = `Agent ${agentName} completed ${result.iterationCount} iterations: ${result.discoveries.length} discoveries, ${result.proposedActions.length} proposed actions.`;
    }
  } catch (err: unknown) {
    result.error = (err as Error).message?.slice(0, 200) || 'Unknown error';
    result.summary = `Agent ${agentId} failed: ${result.error}`;
  }

  return result;
}
