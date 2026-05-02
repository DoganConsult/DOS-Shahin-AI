// @ts-nocheck
import { logger } from '@dos/platform-core/observability';
import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// LangGraph Single Agent Graph
// Replaces the agent-tool-executor loop with a
// structured LangGraph StateGraph that provides:
//   - Explicit node-based execution flow
//   - Checkpoint-based resume on failure
//   - Mode-gated action execution
//   - Memory persistence per cycle
// ============================================

import { Annotation, StateGraph, END, START } from '@langchain/langgraph';
import { HumanMessage, ToolMessage as LcToolMessage } from '@langchain/core/messages';
import type { BaseMessage } from '@langchain/core/messages';
import type { RunnableConfig } from '@langchain/core/runnables';

import {
  type ProposedAction,
  type AgentDiscovery,
  type PlatformMode,
} from '../types/agent-state.js';
import { AgentOutputSchema } from '../types/agent-output.js';
import { getChatModelForAgent } from '../adapters/model-adapter.js';
import { convertAllTools, type AgentToolDefinition } from '../adapters/tool-adapter.js';
import { LANGGRAPH_CONFIG, createTracingCallbacks, createMetricsCallback } from '../config/langgraph.config.js';
import { getCheckpointSaver } from '../adapters/checkpoint-factory.js';
import { toErrorMessage } from '../../utils/http-error.util.js';
import { persistReasoningTrace, computeConfidence, getHistoricalAccuracy, type ReasoningStep as AuditReasoningStep } from '../../../adapters/reasoning-audit.adapter';

// ── Node timeout helper ─────────────────────────────────────────

const NODE_TIMEOUT_MS = parseInt(process.env.LANGGRAPH_NODE_TIMEOUT_MS || '120000', 10);

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`[LangGraph] ${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer!));
}

// ── State annotation ────────────────────────────────────────────
// Using Annotation.Root per LangGraph v1.2+ API for proper typing.

export const AgentStateAnnotation = Annotation.Root({
  // Identity
  tenantId: Annotation<string>,
  agentId: Annotation<string>,
  runId: Annotation<string>,

  // Conversation — append-only reducer
  messages: Annotation<BaseMessage[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),

  // Tool tracking
  toolCallCount: Annotation<number>({
    reducer: (_a, b) => b,
    default: () => 0,
  }),

  // Outputs — append-only reducers
  discoveries: Annotation<AgentDiscovery[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  proposedActions: Annotation<ProposedAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  executedActions: Annotation<ProposedAction[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),

  // Mode gating
  platformMode: Annotation<PlatformMode>({
    reducer: (_a, b) => b,
    default: () => 'hybrid' as PlatformMode,
  }),
  autonomyLevel: Annotation<number>({
    reducer: (_a, b) => b,
    default: () => 0,
  }),

  // Context (injected by contextLoader node)
  orgContext: Annotation<Record<string, unknown>>({
    reducer: (_a, b) => b,
    default: () => ({}),
  }),
  agentMemory: Annotation<string[]>({
    reducer: (_a, b) => b,
    default: () => [],
  }),
  handoffs: Annotation<Array<{ fromAgent: string; payload: unknown }>>({
    reducer: (_a, b) => b,
    default: () => [],
  }),

  // Tier 1 #4: Reasoning transparency — intermediate steps emitted to frontend
  reasoningSteps: Annotation<Array<{ step: string; message: string; progress: number; timestamp: string }>>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),

  // Pillar 3: Reasoning persistence — detailed audit steps for explainability
  auditSteps: Annotation<AuditReasoningStep[]>({
    reducer: (a, b) => [...a, ...b],
    default: () => [],
  }),
  startTime: Annotation<number>({
    reducer: (_a, b) => b,
    default: () => Date.now(),
  }),

  // Guard state
  userId: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
  injectionDetected: Annotation<boolean>({
    reducer: (_a, b) => b,
    default: () => false,
  }),

  // Control flow
  shouldContinue: Annotation<boolean>({
    reducer: (_a, b) => b,
    default: () => true,
  }),
  error: Annotation<string>({
    reducer: (_a, b) => b,
    default: () => '',
  }),
});

/** Inferred full state type */
type AgentState = typeof AgentStateAnnotation.State;

// ── Tool discovery mapping (reused from agent-tool-executor) ────

const TOOL_DISCOVERY_MAP: Record<string, string> = {
  identify_risks: 'risk', score_risk: 'risk', check_risk_appetite: 'risk',
  detect_gaps: 'gap', compare_frameworks: 'gap', detect_evidence_gaps: 'gap',
  generate_roadmap: 'recommendation', analyze_gaps: 'gap',
  analyze_regulatory_impact: 'violation', assess_vendor: 'risk', score_vendor: 'risk',
};

// ── Tier 1 #4: Reasoning step emitter ───────────────────────────
// Pushes intermediate reasoning steps to frontend via WebSocket and stores for audit.

function emitStep(state: AgentState, step: string, message: string, progress: number): Array<{ step: string; message: string; progress: number; timestamp: string }> {
  const entry = { step, message, progress, timestamp: new Date().toISOString() };
  import('../../platform/dos/events/websocket.service.js').then(({ pushToTenant }) => {
    pushToTenant(state.tenantId, {
      type: 'agent.reasoning_step',
      data: { runId: state.runId, agentId: state.agentId, ...entry },
    });
  }).catch(catchHandler(EC.EVENT_BUS, { tenantId: state.tenantId }));
  import('../../openclaw/ag-ui/ag-ui-streaming.js').then(({ publishProgressEvent }) => {
    publishProgressEvent(state.agentId, state.runId, { step, percentage: progress, message });
  }).catch(catchHandler(EC.EVENT_BUS, { tenantId: state.tenantId }));
  return [entry];
}

// ── Tier 1 #2: Confidence scoring helper ────────────────────────
// Calculates confidence per action based on evidence strength + historical accuracy.

async function _computeActionConfidence(
  tenantId: string, agentId: string, actionType: string, contextKeyCount: number,
): Promise<number> {
  const evidenceStrength = Math.min(contextKeyCount / 10, 1); // 0-1
  let historicalRate = 0.5; // default
  try {
    const { safeQuery } = await import('../../config/database.js');
    const { rows } = await safeQuery(
      `SELECT COUNT(*) FILTER (WHERE status = 'approved') * 1.0 / NULLIF(COUNT(*), 0) AS rate
       FROM agent_pending_actions WHERE agent_id = $1 AND action_type = $2
       AND created_at > now() - interval '90 days'`,
      [agentId, actionType],
    );
    if (rows[0]?.rate != null) historicalRate = Number(rows[0].rate);
  } catch { /* historical lookup non-fatal */ }
  return Math.round((evidenceStrength * 0.3 + 0.7 * 0.4 + historicalRate * 0.3) * 100);
}

// ── Node implementations ────────────────────────────────────────

/**
 * contextLoader — builds the agent's domain-specific context
 * from the tenant database (org profile, frameworks, controls, etc.).
 * Delegates to the existing CONTEXT_BUILDERS map in agent-runner.service.
 */
async function contextLoader(state: AgentState): Promise<Partial<AgentState>> {
  const nodeStart = Date.now();
  const steps = emitStep(state, 'context_loading', `Loading ${state.agentId} domain context...`, 10);
  try {
    const { CONTEXT_BUILDERS } = await import('../../modules/ai/services/agents/core/agent-runner.service.js');
    const { tenantSchema } = await import('../../config/database.js');
    const schema = tenantSchema(state.tenantId);

    const builder = CONTEXT_BUILDERS[state.agentId];
    if (!builder) {
      return { orgContext: {}, error: `No context builder for agent ${state.agentId}`, reasoningSteps: steps };
    }

    const context = await builder(state.tenantId, schema);
    const keyCount = Object.keys(context as Record<string, unknown> || {}).length;
    steps.push(...emitStep(state, 'context_loaded', `Loaded ${keyCount} context fields from tenant database`, 20));
    const auditStep: AuditReasoningStep = {
      stepIndex: state.auditSteps.length,
      nodeId: 'contextLoader',
      reasoning: `Loaded ${keyCount} context dimensions for agent ${state.agentId}`,
      toolsUsed: [],
      durationMs: Date.now() - nodeStart,
    };
    return { orgContext: context as Record<string, unknown>, reasoningSteps: steps, auditSteps: [auditStep] };
  } catch (err: unknown) {
    logger.warn(`[LangGraph:${state.agentId}] contextLoader error: ${toErrorMessage(err)}`);
    const auditStep: AuditReasoningStep = {
      stepIndex: state.auditSteps.length,
      nodeId: 'contextLoader',
      reasoning: `Context load failed: ${toErrorMessage(err)}`,
      toolsUsed: [],
      durationMs: Date.now() - nodeStart,
    };
    return { orgContext: {}, error: `Context load failed: ${toErrorMessage(err)}`, reasoningSteps: steps, auditSteps: [auditStep] };
  }
}

/**
 * memoryRecall — loads agent memory from the memory store,
 * including pending handoffs from the cooperation service.
 */
async function memoryRecall(state: AgentState): Promise<Partial<AgentState>> {
  const nodeStart = Date.now();
  const steps = emitStep(state, 'memory_recall', 'Recalling memories from previous cycles...', 25);
  const memories: string[] = [];
  const handoffs: Array<{ fromAgent: string; payload: unknown }> = [];

  try {
    const { retrieveMemories } = await import('../../modules/ai/services/memory/memory-store.service.js');
    const contextSummary = state.orgContext
      ? JSON.stringify(state.orgContext).slice(0, 500)
      : '';

    const retrieved = await retrieveMemories({
      tenantId: state.tenantId,
      agentId: state.agentId,
      query: `${state.agentId} agent context: ${contextSummary}`,
      types: ['personal', 'task', 'tool'],
      topK: 5,
    });

    for (const m of retrieved) {
      memories.push(`[${m.memory_type}] ${m.content}`);
    }
  } catch {
    // Memory retrieval is non-fatal
  }

  try {
    const { getPendingHandoffs } = await import('../../modules/ai/services/agents/agent-cooperation.service.js');
    // Requirements: 5.2 Optimized Handoff Protocol - use batching
    const pending = await getPendingHandoffs(state.tenantId, state.agentId, true); // use batching
    for (const h of pending) {
      handoffs.push({ fromAgent: h.fromAgent, payload: h.payload });
    }
  } catch {
    // Handoff retrieval is non-fatal
  }

  steps.push(...emitStep(state, 'memory_recalled', `Recalled ${memories.length} memories, ${handoffs.length} handoffs`, 30));
  const auditStep: AuditReasoningStep = {
    stepIndex: state.auditSteps.length,
    nodeId: 'memoryRecall',
    reasoning: `Recalled ${memories.length} memories and ${handoffs.length} handoffs`,
    toolsUsed: [],
    durationMs: Date.now() - nodeStart,
  };
  return { agentMemory: memories, handoffs, reasoningSteps: steps, auditSteps: [auditStep] };
}

/**
 * reasoning — calls ChatAnthropic with the agent's tools bound,
 * processes the response, and appends messages to the conversation.
 */
async function reasoning(state: AgentState): Promise<Partial<AgentState>> {
  const nodeStart = Date.now();
  try {
    const { loadAgentDef } = await import('../../config/claude-client.js');
    const agentDef = loadAgentDef(state.agentId) as Record<string, unknown>;
    if (!agentDef) {
      return { shouldContinue: false, error: `Agent def not found: ${state.agentId}` };
    }

    const chatModel = getChatModelForAgent({
      temperature: agentDef.temperature as number,
      maxTokens: agentDef.maxTokens as number,
    });

    // Resolve system prompt: prefer versioned prompt from registry, fallback to agent def
    let resolvedSystemPrompt = (agentDef.systemPrompt as string) || `You are ${agentDef.name}, an AGRC-OS autonomous agent.`;
    try {
      const { resolveActivePromptForAgent } = await import('../../modules/ai-governance/services/misc/prompt-registry.service.js');
      const registryPrompt = await resolveActivePromptForAgent(state.tenantId, state.agentId);
      if (registryPrompt?.template_text) {
        resolvedSystemPrompt = registryPrompt.template_text;
      }
    } catch {
      // Prompt registry resolution is non-fatal; use agent def fallback
    }

    // Build the system prompt with context, memory, and handoffs
    const systemParts: string[] = [
      resolvedSystemPrompt,
    ];

    if ((agentDef.knowledge as string[] | undefined)?.length) {
      systemParts.push(`\n## Knowledge Domains\n${(agentDef.knowledge as string[]).map((k: string) => `- ${k}`).join('\n')}`);
    }
    if ((agentDef.guardrails as string[] | undefined)?.length) {
      systemParts.push(`\n## Guardrails\n${(agentDef.guardrails as string[]).map((g: string) => `- ${g}`).join('\n')}`);
    }

    if (state.agentMemory && state.agentMemory.length > 0) {
      systemParts.push(`\n## Agent Memory\n${state.agentMemory.map((m: string) => `- ${m}`).join('\n')}`);
    }

    if (state.orgContext && Object.keys(state.orgContext).length > 0) {
      systemParts.push(`\n## Tenant Context\nTenant ID: ${state.tenantId}`);
      for (const [key, value] of Object.entries(state.orgContext)) {
        if (value !== null && value !== undefined) {
          const display = typeof value === 'object' ? JSON.stringify(value) : String(value);
          systemParts.push(`${key}: ${display}`);
        }
      }
    }

    if (state.handoffs && state.handoffs.length > 0) {
      const handoffText = state.handoffs
        .map((h: { fromAgent: string; payload: unknown }) => `[Handoff from ${h.fromAgent}]: ${JSON.stringify(h.payload)}`)
        .join('\n');
      systemParts.push(`\n## Inter-Agent Handoffs\n${handoffText}`);
    }

    systemParts.push(`
## Operating Mode
Platform mode: ${state.platformMode} | Autonomy level: ${state.autonomyLevel}
You are an AUTONOMOUS agent. Use tools to gather data, analyze, decide, and act.
When finished, output your findings as structured JSON with reasoning, discoveries, and actions.`);

    // Get registered tools with governance-driven capability gating
    const { getToolsForAgent } = await import('../../modules/ai/services/agents/core/agent-tool-executor.service.js');
    const { getGatedToolsForAgentAsync } = await import('../../ai/tools/tool-registry.js');
    let toolDefs: AgentToolDefinition[];
    try {
      // Use permission-gated tools when userId available (Law 6: Bounded AI)
      toolDefs = await getGatedToolsForAgentAsync(
        state.agentId,
        state.tenantId,
        (state as Record<string, unknown>).userId as string ?? undefined,
      ) as unknown as AgentToolDefinition[];
    } catch {
      // Fallback to standard agent tools if gating unavailable
      toolDefs = getToolsForAgent(state.agentId) as unknown as AgentToolDefinition[];
    }
    const langchainTools = convertAllTools(toolDefs, state.tenantId);

    const steps = emitStep(state, 'reasoning_start', `Analyzing with ${langchainTools.length} tools available...`, 40);

    // Bind tools to the model
    const modelWithTools = langchainTools.length > 0
      ? chatModel.bindTools(langchainTools)
      : chatModel;

    // If there are no messages yet, create the initial user message
    let messages = [...state.messages];
    if (messages.length === 0) {
      messages = [new HumanMessage({
        content: `Run your autonomous analysis and reporting cycle for tenant ${state.tenantId}.`,
      })];
    }

    // Invoke the model with a per-node timeout to prevent indefinite hangs
    const response = await withTimeout(
      modelWithTools.invoke(messages, { configurable: { system_message: systemParts.join('\n') } }),
      NODE_TIMEOUT_MS,
      `reasoning:${state.agentId}`,
    );

    // Append the AI response to messages
    const newMessages: BaseMessage[] = [response as BaseMessage];

    // Check if there are tool calls
    const toolCalls = (response as unknown as { tool_calls?: unknown[] }).tool_calls || [];
    const hasToolCalls = toolCalls.length > 0;

    steps.push(...emitStep(state, 'reasoning_complete',
      hasToolCalls ? `Identified ${toolCalls.length} tool call(s) to execute` : 'Reasoning complete — proposing actions',
      hasToolCalls ? 50 : 70));

    const auditStep: AuditReasoningStep = {
      stepIndex: state.auditSteps.length,
      nodeId: 'reasoning',
      reasoning: hasToolCalls ? `Identified ${toolCalls.length} tool call(s)` : 'Reasoning complete, proposing actions',
      toolsUsed: toolCalls.map((tc: { name?: string }) => tc.name || 'any'),
      outputSummary: typeof response.content === 'string' ? response.content.slice(0, 500) : undefined,
      durationMs: Date.now() - nodeStart,
    };
    return {
      messages: newMessages,
      toolCallCount: state.toolCallCount + (hasToolCalls ? toolCalls.length : 0),
      shouldContinue: hasToolCalls,
      reasoningSteps: steps,
      auditSteps: [auditStep],
    };
  } catch (err: unknown) {
    logger.error(`[LangGraph:${state.agentId}] reasoning error: ${toErrorMessage(err)}`);
    const auditStep: AuditReasoningStep = {
      stepIndex: state.auditSteps.length,
      nodeId: 'reasoning',
      reasoning: `Reasoning failed: ${toErrorMessage(err)}`,
      toolsUsed: [],
      durationMs: Date.now() - nodeStart,
    };
    return { shouldContinue: false, error: `Reasoning failed: ${toErrorMessage(err)}`, auditSteps: [auditStep] };
  }
}

/**
 * toolExecution — executes tool calls from the latest AI message,
 * appends ToolMessage results back to the conversation.
 */
async function toolExecution(state: AgentState): Promise<Partial<AgentState>> {
  const nodeStart = Date.now();
  const { getToolsForAgent } = await import('../../modules/ai/services/agents/core/agent-tool-executor.service.js');
  const { getGatedToolsForAgentAsync } = await import('../../ai/tools/tool-registry.js');
  let toolDefs: AgentToolDefinition[];
  try {
    toolDefs = await getGatedToolsForAgentAsync(state.agentId, state.tenantId, (state as Record<string, unknown>).userId as string ?? undefined) as unknown as AgentToolDefinition[];
  } catch {
    toolDefs = getToolsForAgent(state.agentId) as unknown as AgentToolDefinition[];
  }

  // Find the last AI message with tool calls
  const lastMessage = state.messages[state.messages.length - 1];
  const toolCalls = (lastMessage as unknown as { tool_calls?: unknown[] })?.tool_calls || [];

  if (toolCalls.length === 0) {
    return { shouldContinue: false };
  }

  const TOOL_TIMEOUT_MS = Math.min(NODE_TIMEOUT_MS, 30_000);
  const toolMessages: BaseMessage[] = [];

  for (const call of toolCalls as Record<string, unknown>[]) {
    const toolDef = toolDefs.find((t: AgentToolDefinition) => t.name === call.name);
    let result: string;

    if (!toolDef) {
      result = JSON.stringify({ error: `Unknown tool: ${call.name}` });
    } else {
      try {
        const output = await withTimeout(
          Promise.resolve(toolDef.handler(state.tenantId, (call.args || {}) as Record<string, unknown>)),
          TOOL_TIMEOUT_MS,
          `tool:${call.name}`,
        );
        result = typeof output === 'string' ? output : JSON.stringify(output);
      } catch (err: unknown) {
        result = JSON.stringify({ error: toErrorMessage(err) || 'Tool execution failed' });
      }
    }

    import('../../openclaw/ag-ui/ag-ui-streaming.js').then(({ publishToolCallEvent }) => {
      const parsedResult = (() => { try { return JSON.parse(result); } catch { return result; } })();
      const isErr = typeof parsedResult === 'object' && parsedResult?.error;

      publishToolCallEvent(state.agentId, state.runId, call.name as string, call.args || {}, isErr ? undefined : parsedResult, isErr ? parsedResult.error : undefined);
    }).catch(catchHandler(EC.EVENT_BUS));

    // Register discoveries for inter-agent cooperation
    try {
      const { registerDiscovery } = await import('../../modules/ai/services/agents/agent-cooperation.service.js');
      const discoveryType = TOOL_DISCOVERY_MAP[call.name as string];
      if (discoveryType) {
        const args = (call.args || {}) as Record<string, unknown>;
        registerDiscovery(state.tenantId, {
          agentId: state.agentId,
          type: discoveryType as 'anomaly' | 'risk' | 'recommendation' | 'gap' | 'violation',
          severity: 'medium',
          entityType: (args.entityType as string) || 'any',
          entityId: (args.entityId || args.riskId || args.vendorId) as string,
          title: call.name as string,
          details: String(result).slice(0, 500),
        });
      }
    } catch {
      // Discovery registration is non-fatal
    }

    toolMessages.push(new LcToolMessage({
      content: result,
      tool_call_id: call.id as string,
    }));
  }

  const toolNames = (toolCalls as Array<{ name?: string }>).map(tc => tc.name || 'any');
  const auditStep: AuditReasoningStep = {
    stepIndex: state.auditSteps.length,
    nodeId: 'toolExecution',
    reasoning: `Executed ${toolMessages.length} tool call(s): ${toolNames.join(', ')}`,
    toolsUsed: toolNames,
    durationMs: Date.now() - nodeStart,
  };
  return {
    messages: toolMessages,
    shouldContinue: true,
    auditSteps: [auditStep],
  };
}

/**
 * actionProposal — parses the final agent output to extract
 * proposed actions and discoveries from the reasoning.
 */
async function actionProposal(state: AgentState): Promise<Partial<AgentState>> {
  const nodeStart = Date.now();
  // Find the last AI message
  const lastAiMessage = [...state.messages].reverse().find(m => m._getType() === 'ai');
  if (!lastAiMessage) {
    return { proposedActions: [], discoveries: [] };
  }

  const content = typeof lastAiMessage.content === 'string'
    ? lastAiMessage.content
    : JSON.stringify(lastAiMessage.content);

  const discoveries: AgentDiscovery[] = [];
  const proposedActions: ProposedAction[] = [];

  try {
    // Attempt to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*"actions"[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = AgentOutputSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (parsed.success) {
        for (const d of parsed.data.discoveries) {
          discoveries.push({
            type: d.type,
            summary: d.summary,
            severity: d.severity,
            relatedEntityType: d.relatedEntityType,
            relatedEntityId: d.relatedEntityId,
            metadata: d.metadata,
          });
        }
        for (const a of parsed.data.actions) {
          // Pillar 3: Compute multi-factor confidence for each action
          const historicalAccuracy = await getHistoricalAccuracy(state.tenantId, state.agentId, a.type);
          const evidenceStrength = Math.min(Object.keys(state.orgContext).length / 10, 1);
          const { score: confidenceScore } = computeConfidence({
            evidenceStrength,
            historicalAccuracy,
            domainConfidence: 0.7,
            dataCompleteness: evidenceStrength,
          });
          const confidence = Math.round(confidenceScore * 100);
          proposedActions.push({
            type: a.type,
            title: a.title,
            description: a.description,
            priority: a.priority,
            confidence,
            entityType: a.entityType,
            entityId: a.entityId,
            payload: a.payload,
          });
        }
      }
    }
  } catch {
    // If parsing fails, no structured actions extracted — acceptable
  }

  const steps = emitStep(state, 'actions_proposed',
    `Proposed ${proposedActions.length} action(s), ${discoveries.length} discovery(ies)`,
    proposedActions.length > 0 ? 75 : 80);
  const auditStep: AuditReasoningStep = {
    stepIndex: state.auditSteps.length,
    nodeId: 'actionProposal',
    reasoning: `Proposed ${proposedActions.length} actions, ${discoveries.length} discoveries`,
    toolsUsed: [],
    durationMs: Date.now() - nodeStart,
  };
  return { proposedActions, discoveries, reasoningSteps: steps, auditSteps: [auditStep] };
}

/**
 * modeGate — checks the platform autonomy mode and filters
 * proposed actions. Actions that require approval in the
 * current mode are queued as proposals.
 */
async function modeGate(state: AgentState): Promise<Partial<AgentState>> {
  const {

    getTenantPlatformMode, gateAction,
  } = await import('@dos/platform-core/settings/platform-mode-gate.service');

  const mode = await getTenantPlatformMode(state.tenantId);
  const approved: ProposedAction[] = [];

  for (const action of state.proposedActions) {
    const decision = gateAction(
      mode,
      (action.priority || 'medium'),
    );

    if (decision.shouldExecute) {
      approved.push(action);
    } else {
      // Queue for human approval
      try {
        const { createProposal } = await import('../../modules/ai/services/orchestration/agent-orchestration.service.js');
        await createProposal(state.tenantId, {
          agentId: state.agentId,
          type: action.type,
          payload: action as unknown as Record<string, unknown>,
          reason: `Auto-gated by platform mode '${mode}': ${decision.reason}`,
          priority: action.priority || 'medium',
          autoExecutable: false,
        });
      } catch {
        // Proposal creation is non-fatal
      }
    }
  }

  // Override proposedActions with only approved ones for the executor
  return {
    proposedActions: approved,
    platformMode: mode,
  };
}

/**
 * actionExecutor — executes approved actions using the
 * existing executeAction function from agent-runner.service.
 */
async function actionExecutor(state: AgentState): Promise<Partial<AgentState>> {
  const { executeAction } = await import('../../modules/ai/services/agents/core/agent-runner.service.js');
  const executed: ProposedAction[] = [];

  for (const action of state.proposedActions) {
    try {
      await executeAction(state.tenantId, state.agentId, {
        type: action.type as any,
        title: action.title,
        description: action.description || '',
        priority: action.priority || 'medium',
        entityType: action.entityType,
        entityId: action.entityId,
        payload: action.payload,
      });
      executed.push(action);
    } catch (err: unknown) {
      logger.warn(`[LangGraph:${state.agentId}] Action execution failed: ${toErrorMessage(err)}`);
    }
  }

  return { executedActions: executed };
}

/**
 * memoryCommit — saves learnings and discoveries from this run
 * into the memory store for future agent cycles.
 */
async function memoryCommit(state: AgentState): Promise<Partial<AgentState>> {
  try {
    const { commitMemories } = await import('../../modules/ai/services/memory/memory-store.service.js');

    const facts: Array<{ kind: string; text: string; importance?: number; metadata?: Record<string, unknown> }> = [];

    for (const d of state.discoveries) {
      facts.push({
        kind: 'task',
        text: `Discovery [${d.severity}]: ${d.summary}`,
        importance: d.severity === 'critical' ? 0.9 : d.severity === 'high' ? 0.7 : 0.4,
        metadata: { type: d.type, severity: d.severity },
      });
    }

    for (const a of state.executedActions) {
      facts.push({
        kind: 'task',
        text: `Executed action: ${a.type} — ${a.title}`,
        importance: 0.5,
        metadata: { actionType: a.type, priority: a.priority },
      });
    }

    if (facts.length > 0) {
      await commitMemories({
        tenantId: state.tenantId,
        agentId: state.agentId,
        facts: facts as any,
        summary: `${state.agentId} graph run: ${state.discoveries.length} discoveries, ${state.executedActions.length} actions`,
      });
    }
  } catch {
    // Memory commit is non-fatal
  }

  emitStep(state, 'complete',
    `Cycle complete: ${state.discoveries.length} discoveries, ${state.executedActions.length} actions executed`,
    100);

  import('../../openclaw/ag-ui/ag-ui-streaming.js').then(({ publishCompleteEvent }) => {
    publishCompleteEvent(state.agentId, state.runId, {
      success: !state.error,
      summary: `${state.discoveries.length} discoveries, ${state.executedActions.length} actions executed`,
      artifacts: [],
    });
  }).catch(catchHandler(EC.EVENT_BUS));

  // Pillar 3: Persist the full reasoning trace for explainability audit
  try {
    const overallConfidence = state.auditSteps.length > 0
      ? state.auditSteps.reduce((sum, s) => sum + (s.confidence || 0.5), 0) / state.auditSteps.length
      : 0.5;
    await persistReasoningTrace(state.tenantId, {
      runId: state.runId,
      agentId: state.agentId,
      tenantId: state.tenantId,
      steps: state.auditSteps,
      totalDurationMs: Date.now() - state.startTime,
      totalTokens: state.auditSteps.reduce((sum, s) => sum + (s.tokensUsed || 0), 0),
      overallConfidence,
      startedAt: new Date(state.startTime).toISOString(),
      completedAt: new Date().toISOString(),
    });
  } catch {
    // Reasoning trace persistence is non-fatal
  }

  // Record graph run completion event
  try {
    const { recordAgentEvent } = await import('../../modules/ai/services/orchestration/agent-orchestration.service.js');
    await recordAgentEvent(state.tenantId, {
      runId: state.runId,
      agentId: state.agentId,
      eventType: 'graph_run_completed',
      data: {
        toolCallCount: state.toolCallCount,
        discoveryCount: state.discoveries.length,
        actionsProposed: state.proposedActions.length,
        actionsExecuted: state.executedActions.length,
      },
    });
  } catch {
    // Event recording is non-fatal
  }

  return { shouldContinue: false };
}

// ── Conditional edge routers ────────────────────────────────────

function afterReasoningRouter(state: AgentState): string {
  if (state.error) return 'actionProposal';
  if (!state.shouldContinue) return 'actionProposal';
  if (state.toolCallCount >= LANGGRAPH_CONFIG.maxToolIterations) return 'actionProposal';
  return 'toolExecution';
}

function afterToolExecutionRouter(state: AgentState): string {
  if (!state.shouldContinue) return 'actionProposal';
  if (state.toolCallCount >= LANGGRAPH_CONFIG.maxToolIterations) return 'actionProposal';
  return 'reasoning';
}

// ── Graph factory ───────────────────────────────────────────────

/**
 * Creates and compiles a LangGraph StateGraph for a single agent run.
 * The graph implements the full reasoning -> tool -> action lifecycle.
 *
 * Nodes:
 *   contextLoader -> memoryRecall -> reasoning <-> toolExecution -> actionProposal -> modeGate -> actionExecutor -> memoryCommit -> END
 *
 * @returns Compiled runnable graph
 */
export function createSingleAgentGraph() {
  // Build graph using fluent chaining so TypeScript accumulates node names
  const graph = new StateGraph(AgentStateAnnotation)
    .addNode('contextLoader', contextLoader)
    .addNode('memoryRecall', memoryRecall)
    .addNode('reasoning', reasoning)
    .addNode('toolExecution', toolExecution)
    .addNode('actionProposal', actionProposal)
    .addNode('modeGate', modeGate)
    .addNode('actionExecutor', actionExecutor)
    .addNode('memoryCommit', memoryCommit)
    // Entry
    .addEdge(START, 'contextLoader')
    // Linear: contextLoader -> memoryRecall -> reasoning
    .addEdge('contextLoader', 'memoryRecall')
    .addEdge('memoryRecall', 'reasoning')
    // Conditional: reasoning -> toolExecution or actionProposal
    .addConditionalEdges('reasoning', afterReasoningRouter, {
      toolExecution: 'toolExecution',
      actionProposal: 'actionProposal',
    })
    // Conditional: toolExecution -> reasoning (loop) or actionProposal
    .addConditionalEdges('toolExecution', afterToolExecutionRouter, {
      reasoning: 'reasoning',
      actionProposal: 'actionProposal',
    })
    // Linear tail: actionProposal -> modeGate -> actionExecutor -> memoryCommit -> END
    .addEdge('actionProposal', 'modeGate')
    .addEdge('modeGate', 'actionExecutor')
    .addEdge('actionExecutor', 'memoryCommit')
    .addEdge('memoryCommit', END);

  try {
    return graph.compile({ checkpointer: getCheckpointSaver() });
  } catch {
    // Fallback: compile without checkpointer if checkpoint table doesn't exist yet
    return graph.compile();
  }
}

/**
 * Run a single agent through the LangGraph pipeline.
 * This is the primary entry point used by activities and the orchestrator.
 *
 * @param tenantId  Multi-tenant scope
 * @param agentId   Agent ID (A01-A12)
 * @param opts      Optional overrides for mode, run ID, and Temporal correlation
 * @returns Final graph state after execution
 */
export async function runSingleAgentGraph(
  tenantId: string,
  agentId: string,
  opts?: {
    runId?: string;
    platformMode?: PlatformMode;
    autonomyLevel?: number;
    config?: RunnableConfig;
    temporalWorkflowId?: string;
  },
): Promise<typeof AgentStateAnnotation.State> {

  const { getTenantPlatformMode } = await import('@dos/platform-core/settings/platform-mode-gate.service');
  const { mapModeToAutonomy } = await import('../../modules/ai/services/orchestration/agent-orchestration.service.js');

  const mode = opts?.platformMode || await getTenantPlatformMode(tenantId);
  const autonomyMap: Record<string, number> = { L0: 0, L1: 1, L2: 2, L3: 3 };
  const autonomyLevel = opts?.autonomyLevel ?? autonomyMap[mapModeToAutonomy(mode)] ?? 0;

  const runId = opts?.runId || `run_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

  const initialState: Partial<typeof AgentStateAnnotation.State> = {
    tenantId,
    agentId,
    runId,
    messages: [],
    toolCallCount: 0,
    discoveries: [],
    proposedActions: [],
    executedActions: [],
    platformMode: mode,
    autonomyLevel,
    shouldContinue: true,
    error: '',
    orgContext: {},
    agentMemory: [],
    handoffs: [],
    reasoningSteps: [],
    auditSteps: [],
    startTime: Date.now(),
  };

  const compiledGraph = createSingleAgentGraph();

  const tracingCallbacks = createTracingCallbacks();
  const metricsCallback = createMetricsCallback(
    runId,
    agentId,
    tenantId,
    'single-agent',
    {
      langsmithTraceId: opts?.config?.metadata?.langsmithTraceId as string | undefined,
      temporalWorkflowId: opts?.temporalWorkflowId,
    },
  );
  
  const allCallbacks = [
    ...tracingCallbacks,
    ...(metricsCallback ? [metricsCallback] : []),
  ];
  
  const config: RunnableConfig = (opts?.config || {
    configurable: {
      thread_id: `${tenantId}:${agentId}:${runId}`,
    },
    callbacks: allCallbacks.length > 0 ? allCallbacks : undefined,
    tags: [`agent:${agentId}`, `tenant:${tenantId}`, `run:${runId}`, 'graph:single_agent'],
    metadata: {
      tenantId,
      agentId,
      runId,
      temporalWorkflowId: opts?.temporalWorkflowId,
      graphType: 'single_agent',
    },
  }) as RunnableConfig;

  let status: 'success' | 'error' | 'timeout' | 'cancelled' = 'success';
  try {
    const result = await compiledGraph.invoke(initialState, config);
    
    // Record metrics from result state
    if (metricsCallback) {
      if (result.discoveries && result.discoveries.length > 0) {
        result.discoveries.forEach(() => metricsCallback?.recordDiscovery());
      }
      if (result.proposedActions && result.proposedActions.length > 0) {
        result.proposedActions.forEach(() => metricsCallback?.recordProposedAction());
      }
      if (result.executedActions && result.executedActions.length > 0) {
        result.executedActions.forEach(() => metricsCallback?.recordExecutedAction());
      }
      if (result.error) {
        status = 'error';
      }
      await metricsCallback.finalize(status);
    }
    
    return result;
  } catch (err) {
    status = 'error';
    if (metricsCallback) {
      await metricsCallback.finalize(status);
    }
    throw err;
  }
}
