// @ts-nocheck
// ================================================================
// Shahin — Agent Tool Executor (Multi-Step Autonomous Engine)
// ================================================================
// Core engine that drives every agent as a TRUE autonomous agent:
// 1. Loads agent definition + tool schemas
// 2. Builds rich tenant-specific context
// 3. Calls Claude with native tool_use API
// 4. Executes tool handlers, feeds results back
// 5. Repeats until agent signals end_turn or maxSteps
// 6. Integrates cooperation (handoffs, discoveries)
// 7. Records performance and audit trail
// ================================================================
import { loadAgentDef, } from '../../../ports/ai.port';
import { safeQuery } from "@dos/db";
import { enforceToolGate } from "../../governance/tool-gate.service";
import { checkCostCap, tokensToUsd } from "../../governance/cost-cap.service";
import { AGRC_AGENTS } from "@shahin-ai/product";
// OTEL — explicit LLM-flavoured spans alongside the auto-instrumented http/pg/ioredis.
// Falls back to no-op tracer when OTEL is disabled.
import { trace as otelTrace, SpanStatusCode } from "@opentelemetry/api";
// ----------------------------------------------------------------
// Global Tool Registry
// ----------------------------------------------------------------
const toolRegistry = new Map();
/** Register tools for a specific agent */
export function registerAgentTools(agentId, tools) {
    toolRegistry.set(agentId, tools);
}
/** Get registered tools for an agent */
export function getToolsForAgent(agentId) {
    return toolRegistry.get(agentId) || [];
}
/** Get Anthropic-formatted tool definitions (no handler) for API call */
function getClaudeToolDefs(agentId) {
    const tools = getToolsForAgent(agentId);
    return tools.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema,
    }));
}
/** Find a handler by tool name for a specific agent */
function findHandler(agentId, toolName) {
    const tools = getToolsForAgent(agentId);
    const found = tools.find((t) => t.name === toolName);
    return found ? found.handler : null;
}
// ----------------------------------------------------------------
// Cooperation Discovery Mapping
// ----------------------------------------------------------------
/** Map tool names to discovery types for inter-agent cooperation */
const TOOL_DISCOVERY_MAP = {
    // A07 → A06 risk discoveries
    identify_risks: "risk",
    score_risk: "risk",
    check_risk_appetite: "risk",
    // A03 → A04 framework gaps
    detect_gaps: "gap",
    compare_frameworks: "gap",
    // A05 → evidence gaps
    detect_evidence_gaps: "gap",
    // A06 → remediation
    generate_roadmap: "recommendation",
    analyze_gaps: "gap",
    // A08 → policy violations
    analyze_regulatory_impact: "violation",
    // A09 → vendor risks
    assess_vendor: "risk",
    score_vendor: "risk",
};
// ----------------------------------------------------------------
// Core Multi-Step Tool Execution Engine
// ----------------------------------------------------------------
/**
 * Run an agent with multi-step tool execution.
 * This is the PRIMARY entry point for autonomous agent operation.
 *
 * @param tenantId    Multi-tenant scope
 * @param agentId     Agent ID (A01–A10)
 * @param context     Pre-built tenant context (from context builders)
 * @param userMessage Optional user query (for interactive mode)
 * @param opts        Override maxSteps or temperature
 */
export async function runAgentWithTools(tenantId, agentId, context, userMessage, opts) {
    const startMs = Date.now();
    const maxSteps = opts?.maxSteps || 5;
    const toolResultsRecord = [];
    const discoveries = [];
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let finalText = '';
    let stopReason = 'max_steps';
    // Extract from Anthropic client (decoupled via ports in real deployment)
    const { callClaude } = await import('../../../config/claude-client');
    const agentDef = loadAgentDef(agentId) || { name: agentId };
    // Wave 2 #1.3: DB-first overlay — match agent-runner.service so canonical
    // ai_agent_registry rows (model/temperature/promptName/datasetName) drive
    // executor behaviour. Falls back to in-memory defaults when DB is empty.
    try {
        const { loadAgentDefFromDb } = await import('@dos/core-ai/agent-loader');
        const dbDef = await loadAgentDefFromDb(agentId);
        if (dbDef) {
            agentDef.id = dbDef.agentCode;
            agentDef.name = dbDef.name ?? agentDef.name;
            agentDef.model = dbDef.model ?? agentDef.model;
            agentDef.temperature = dbDef.temperature ?? agentDef.temperature;
            agentDef.promptName = dbDef.promptName ?? agentDef.promptName;
            agentDef.datasetName = dbDef.datasetName ?? agentDef.datasetName;
            agentDef.capabilities = dbDef.capabilities ?? agentDef.capabilities;
        }
    }
    catch { /* DB overlay optional */ }
    // Wave 1.7: overlay agentDef.systemPrompt with the production-labelled
    // Langfuse prompt so versioning/rollback happens out-of-band. Falls back
    // to the in-code default when Langfuse is unreachable.
    //
    // Wave 2 #2.2: render {{input}} and {{context}} placeholders against the
    // request payload + retrieved RAG/memory blocks BEFORE the body lands
    // in agentDef.systemPrompt. Without this the placeholders survived into
    // the LLM call as literal `{{context}}` text, leaving Langfuse-versioned
    // prompts effectively un-grounded.
    try {
        const { getAgentSystemPrompt } = await import('../../../../../domain/agrc-engine/observability/langfuse-bridge.js');
        const resolved = await getAgentSystemPrompt(agentId, agentDef.systemPrompt || `You are ${agentDef.name}, a Shahin-Ai autonomous agent.`);
        if (resolved?.body) {
            const ctxParts = [];
            if (typeof context.priorMemoryBlock === 'string' && context.priorMemoryBlock)
                ctxParts.push(context.priorMemoryBlock);
            if (typeof context.ragContextBlock === 'string' && context.ragContextBlock)
                ctxParts.push(context.ragContextBlock);
            const ctxStr = ctxParts.join('\n').trim();
            const renderedBody = resolved.body
                .replace(/\{\{\s*input\s*\}\}/g, String(userMessage ?? ''))
                .replace(/\{\{\s*context\s*\}\}/g, ctxStr || '(no retrieved context)')
                .replace(/\{\{\s*tenantId\s*\}\}/g, String(tenantId ?? ''))
                .replace(/\{\{\s*agentId\s*\}\}/g, String(agentId ?? ''));
            agentDef.systemPrompt = renderedBody;
        }
        if (resolved?.model && !agentDef.model)
            agentDef.model = resolved.model;
        if (resolved?.temperature != null && agentDef.temperature == null)
            agentDef.temperature = resolved.temperature;
    }
    catch { /* fallback to in-code prompt */ }
    const systemPrompt = buildAgentSystemPrompt(agentDef, context, tenantId);
    const promptUserMessage = userMessage || buildAutonomousTrigger(agentId, context);
    const tools = getClaudeToolDefs(agentId);
    const messages = [
        { role: 'user', content: promptUserMessage }
    ];
    // ── Tier 3.A: open Langfuse trace for the full run (no-op if not configured) ──
    // Wave 2: enrich with canonical agent metadata (READ-only from AGRC_AGENTS) +
    // userId/sessionId from runAgent caller. Tag surface:agent-<id> is added by
    // langfuse-bridge.createEngineTrace from engineType="agent.<id>".
    let lfTrace = null;
    try {
        const agentDef = AGRC_AGENTS.find((a) => a.id === agentId);
        const lf = await import('../../../../../domain/agrc-engine/observability/langfuse-bridge.js');
        const t = await lf.createEngineTrace({
            tenantId,
            runId: `agent-${agentId}-${startMs}`,
            engineType: `agent.${agentId}`,
            userId: opts?.userId,
            metadata: {
                agentId,
                userMessage: (userMessage || '').slice(0, 256),
                // canonical metadata — read-only mirror of agrc-agents.ts source of truth
                agentName: agentDef?.name,
                agentNameAr: agentDef?.nameAr,
                agentDomain: agentDef?.domain,
                approvalBoundary: agentDef?.governance?.approvalBoundary,
                maxActionsPerCycle: agentDef?.governance?.maxActionsPerCycle,
                sessionId: opts?.sessionId,
            },
        });
        lfTrace = t?.trace ?? null;
        if (lfTrace && opts?.sessionId) {
            try {
                lfTrace.update({ sessionId: opts.sessionId });
            }
            catch { /* ignore */ }
        }
    }
    catch { /* Langfuse not available — continue without */ }
    // ── OTEL — root span for the full agent run, exported to Jaeger via OTLP. ──
    const otelTracer = otelTrace.getTracer('ai-engine-service', '0.1.0');
    const runSpan = otelTracer.startSpan(`agent.${agentId}.run`, {
        attributes: {
            'ai.agent.id': agentId,
            'ai.tenant.id': tenantId,
            'ai.agent.user_message': (userMessage || '').slice(0, 256),
            'ai.agent.max_steps': maxSteps,
        },
    });
    for (let step = 0; step < maxSteps; step++) {
        // D3: Check abort signal before each Claude API call
        if (opts?.signal?.aborted) {
            finalText = 'Agent execution aborted by caller.';
            stopReason = 'aborted';
            break;
        }
        // ── Tier 3.B: real-time cost cap before each Claude call ──
        const costCheck = await checkCostCap(tenantId, /* estimatedNextCallUsd */ 0.05);
        if (!costCheck.allowed) {
            finalText = `Run aborted: ${costCheck.reason}`;
            stopReason = 'budget_exceeded';
            try {
                const m = await import('../../../../audit/services/audit/core/audit-trail.service.js');
                await m.recordAudit(tenantId, `agent-${agentId}`, 'agent.budget.denied', 'agent_run', agentId, costCheck);
            }
            catch { /* audit absent */ }
            break;
        }
        const callStart = Date.now();
        const callSpan = otelTracer.startSpan(`claude.chat.step.${step}`, {
            attributes: {
                'gen_ai.system': 'anthropic',
                'gen_ai.request.model': process.env.CLAUDE_MODEL || 'claude-sonnet-4',
                'gen_ai.request.temperature': opts?.temperature ?? 0.2,
                'ai.agent.id': agentId,
                'ai.tenant.id': tenantId,
                'ai.agent.step': step,
                'ai.agent.tool_count': tools.length,
            },
        });
        let response;
        try {
            response = await callClaude({
                tenantId,
                agentId,
                systemPrompt,
                messages,
                tools: tools.length > 0 ? tools : undefined,
                temperature: opts?.temperature ?? 0.2,
            });
            callSpan.setAttribute('gen_ai.response.model', response.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4');
            callSpan.setAttribute('gen_ai.usage.input_tokens', response.inputTokens || 0);
            callSpan.setAttribute('gen_ai.usage.output_tokens', response.outputTokens || 0);
            callSpan.setAttribute('gen_ai.response.finish_reasons', response.stopReason || 'unknown');
            callSpan.setAttribute('ai.cost.usd', tokensToUsd(response.inputTokens || 0, response.outputTokens || 0));
            callSpan.setStatus({ code: SpanStatusCode.OK });
        }
        catch (err) {
            callSpan.recordException(err);
            callSpan.setStatus({ code: SpanStatusCode.ERROR, message: err?.message });
            callSpan.end();
            throw err;
        }
        callSpan.end();
        totalInputTokens += response.inputTokens || 0;
        totalOutputTokens += response.outputTokens || 0;
        // ── Tier 3.A: log the LLM generation to Langfuse ──
        if (lfTrace) {
            try {
                const lf = await import('../../../../../domain/agrc-engine/observability/langfuse-bridge.js');
                await lf.logGeneration({
                    trace: lfTrace,
                    name: `claude.step.${step}`,
                    model: response.model || process.env.CLAUDE_MODEL || 'claude-sonnet-4',
                    input: { systemPrompt: systemPrompt.slice(0, 4096), messages },
                    output: response.rawBlocks ?? response.content,
                    usage: {
                        promptTokens: response.inputTokens || 0,
                        completionTokens: response.outputTokens || 0,
                        totalTokens: (response.inputTokens || 0) + (response.outputTokens || 0),
                    },
                    metadata: {
                        stopReason: response.stopReason,
                        stepCostUsd: tokensToUsd(response.inputTokens || 0, response.outputTokens || 0),
                    },
                    durationMs: Date.now() - callStart,
                });
            }
            catch { /* langfuse log fail — continue */ }
        }
        messages.push({ role: 'assistant', content: response.rawBlocks });
        if (response.stopReason === 'tool_use' && response.toolCalls && response.toolCalls.length > 0) {
            const toolBlocks = [];
            const agentMeta = AGRC_AGENTS.find((a) => a.id === agentId)?.governance;
            for (const tCall of response.toolCalls) {
                const handler = findHandler(agentId, tCall.name);
                const stepStart = Date.now();
                let resultData;
                let isError = false;
                // ── Governance gate (Tier 1) ────────────────────────────────────────
                // Every tool call passes through enforceToolGate before reaching the
                // handler. In `enforce` mode the handler is skipped on deny; in `warn`
                // and `audit` modes the call proceeds but is still audited.
                // The proposer is the caller of runAgent (e.g. another agent that
                // delegated, or 'system' for a direct invocation). The approver is
                // the agent currently executing this tool. SoD only fires when the
                // two are different agent identities.
                const callerAgentId = (opts?.visitedAgents || [])[0];
                const proposerId = callerAgentId ? `agent-${callerAgentId}` : 'system';
                const approverId = `agent-${agentId}`;
                const gate = await enforceToolGate({
                    tenantId,
                    agentId,
                    toolName: tCall.name,
                    toolInput: tCall.input,
                    approvalBoundary: agentMeta?.approvalBoundary,
                    toolRiskTier: tCall?.riskTier || agentMeta?.approvalBoundary,
                    maxActionsPerCycle: agentMeta?.maxActionsPerCycle,
                    cycleActionCount: toolResultsRecord.length,
                    callerType: 'agent',
                    proposerType: callerAgentId ? 'agent' : 'service_account',
                    proposerId,
                    approverId,
                });
                if (!gate.allow) {
                    resultData = {
                        blocked: true,
                        reason: gate.reason,
                        decidedBy: gate.decidedBy,
                        requiresApproval: gate.requiresApproval,
                        enforcementMode: gate.enforcementMode,
                    };
                    isError = true;
                }
                else if (handler) {
                    // ── Tier 3.A: open a Langfuse span around the tool execution ──
                    let lfSpan = null;
                    if (lfTrace) {
                        try {
                            const lf = await import('../../../../../domain/agrc-engine/observability/langfuse-bridge.js');
                            lfSpan = await lf.createSpan(lfTrace, `tool.${tCall.name}`, {
                                toolName: tCall.name,
                                agentId,
                                input: tCall.input,
                            });
                        }
                        catch { /* span creation optional */ }
                    }
                    // ── OTEL — child span around the tool execution. ──
                    const toolSpan = otelTracer.startSpan(`agent.tool.${tCall.name}`, {
                        attributes: {
                            'ai.tool.name': tCall.name,
                            'ai.tool.call_id': tCall.id,
                            'ai.agent.id': agentId,
                            'ai.tenant.id': tenantId,
                        },
                    });
                    try {
                        // Propagate the call stack context to the tool handler
                        const toolOpts = { ...opts, visitedAgents: [...(opts?.visitedAgents || []), agentId] };
                        resultData = await handler(tenantId, tCall.input, toolOpts);
                        const dType = TOOL_DISCOVERY_MAP[tCall.name];
                        if (dType)
                            discoveries.push({ type: dType, payload: resultData });
                        toolSpan.setStatus({ code: SpanStatusCode.OK });
                    }
                    catch (err) {
                        resultData = { error: err.message };
                        isError = true;
                        toolSpan.recordException(err);
                        toolSpan.setStatus({ code: SpanStatusCode.ERROR, message: err?.message });
                    }
                    finally {
                        toolSpan.setAttribute('ai.tool.is_error', isError);
                        toolSpan.end();
                        if (lfSpan) {
                            try {
                                const lf = await import('../../../../../domain/agrc-engine/observability/langfuse-bridge.js');
                                lf.endSpan(lfSpan);
                            }
                            catch { /* end-span optional */ }
                        }
                    }
                }
                else {
                    resultData = { error: `Tool ${tCall.name} not found in agent registry.` };
                    isError = true;
                }
                toolResultsRecord.push({
                    toolCallId: tCall.id,
                    toolName: tCall.name,
                    input: tCall.input,
                    output: resultData,
                    isError,
                    durationMs: Date.now() - stepStart,
                });
                toolBlocks.push({
                    type: 'tool_result',
                    tool_use_id: tCall.id,
                    content: typeof resultData === 'string' ? resultData : JSON.stringify(resultData),
                    is_error: isError
                });
            }
            messages.push({ role: 'user', content: toolBlocks });
        }
        else {
            finalText = response.content;
            stopReason = response.stopReason || 'end_turn';
            break;
        }
    }
    const durationMs = Date.now() - startMs;
    const hasError = toolResultsRecord.some(t => t.isError);
    // Record audit execution asynchronously
    import('../../../../../../audit/services/audit/core/audit-trail.service').then(m => {
        m.recordAudit(tenantId, `agent-${agentId}`, 'agent.execution', 'agent', agentId, { steps: toolResultsRecord.length, stopReason }).catch(() => null);
    }).catch(() => null);
    // Record Prometheus metrics for agent execution
    try {
        const { recordAgentRun, recordAgentTokens } = await import('@dos/platform-core/observability');
        recordAgentRun(agentId, durationMs, tenantId, stopReason, hasError);
        recordAgentTokens(agentId, totalInputTokens, totalOutputTokens);
    }
    catch { /* metrics not available */ }
    // ── Tier 3.A: close Langfuse trace with summary score + flush ──
    if (lfTrace) {
        try {
            const lf = await import('../../../../../domain/agrc-engine/observability/langfuse-bridge.js');
            const successScore = stopReason === 'end_turn' && !hasError ? 1 : (hasError ? 0 : 0.5);
            await lf.logScore(lfTrace, 'agent-run-success', successScore, `stopReason=${stopReason} errors=${hasError}`);
            await lf.flushLangfuse();
        }
        catch { /* flush optional */ }
    }
    // ── OTEL — close the root run span with totals ──
    runSpan.setAttribute('gen_ai.usage.total_input_tokens', totalInputTokens);
    runSpan.setAttribute('gen_ai.usage.total_output_tokens', totalOutputTokens);
    runSpan.setAttribute('ai.cost.usd_total', tokensToUsd(totalInputTokens, totalOutputTokens));
    runSpan.setAttribute('ai.agent.tool_calls', toolResultsRecord.length);
    runSpan.setAttribute('ai.agent.duration_ms', durationMs);
    runSpan.setAttribute('ai.agent.stop_reason', stopReason);
    runSpan.setAttribute('ai.agent.has_error', hasError);
    runSpan.setStatus({ code: hasError ? SpanStatusCode.ERROR : SpanStatusCode.OK });
    runSpan.end();
    // ── Persist token + cost to public.agent_performance_log so cost-cap reads recent spend ──
    try {
        await safeQuery(`INSERT INTO public.agent_performance_log
         (tenant_id, agent_id, session_id, duration_ms, tokens_in, tokens_out, tool_calls, stop_reason, is_error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`, [
            tenantId,
            agentId,
            `run-${startMs}`,
            durationMs,
            totalInputTokens,
            totalOutputTokens,
            toolResultsRecord.length,
            stopReason,
            hasError,
        ]);
    }
    catch { /* table may not exist on this tenant — non-fatal */ }
    return {
        agentId,
        tenantId,
        steps: toolResultsRecord.length,
        totalToolCalls: toolResultsRecord.length,
        toolResults: toolResultsRecord,
        finalText,
        totalInputTokens,
        totalOutputTokens,
        // Wave 1 G1.7 — bubble the USD cost up so AgentRunResult.costUsd
        // gets a real number instead of 0. tokensToUsd reads model rates
        // from cost-cap.service.
        costUsd: tokensToUsd(totalInputTokens, totalOutputTokens),
        durationMs,
        stopReason,
        discoveries
    };
}
// ----------------------------------------------------------------
// System Prompt Builder
// ----------------------------------------------------------------
function buildAgentSystemPrompt(agentDef, context, tenantId) {
    const parts = [];
    // Core identity
    parts.push(agentDef.systemPrompt || `You are ${agentDef.name}, a Shahin-Ai autonomous agent.`);
    // Knowledge domains
    if (agentDef.knowledge?.length) {
        parts.push(`\n## Knowledge Domains\n${agentDef.knowledge.map((k) => `- ${k}`).join("\n")}`);
    }
    // Guardrails
    if (agentDef.guardrails?.length) {
        parts.push(`\n## Guardrails\n${agentDef.guardrails.map((g) => `- ${g}`).join("\n")}`);
    }
    // Agent memory from past runs
    if (context._agentMemory && Array.isArray(context._agentMemory) && context._agentMemory.length > 0) {
        const memLines = context._agentMemory.map((m) => `- [${m.type}] ${m.content}`).join('\n');
        parts.push(`\n## Agent Memory (learnings from past runs)\nUse these to inform your decisions:\n${memLines}`);
    }
    // Prior memory injected by agent-runner (Tier 2)
    if (context.priorMemoryBlock && typeof context.priorMemoryBlock === 'string' && context.priorMemoryBlock.length > 0) {
        parts.push(String(context.priorMemoryBlock));
    }
    // RAG retrieved documents injected by agent-runner (Tier 2)
    if (context.ragContextBlock && typeof context.ragContextBlock === 'string' && context.ragContextBlock.length > 0) {
        parts.push(String(context.ragContextBlock));
    }
    // Tenant context
    parts.push(`\n## Current Tenant Context\nTenant ID: ${tenantId}`);
    if (context && typeof context === "object") {
        for (const [key, value] of Object.entries(context)) {
            if (key === '_agentMemory' || key === '_pendingHandoffs')
                continue;
            if (key === 'priorMemoryBlock' || key === 'ragContextBlock' || key === 'retrievalStats')
                continue;
            if (value !== null && value !== undefined) {
                const display = typeof value === "object" ? JSON.stringify(value) : String(value);
                parts.push(`${key}: ${display}`);
            }
        }
    }
    // Autonomous directive
    parts.push(`
## Operating Mode
You are an AUTONOMOUS agent. Use your tools to analyze, decide, and act.
- Examine the tenant context thoroughly before acting.
- Use tools to gather data, then reason about what actions to take.
- Execute multi-step plans: query → analyze → decide → act → verify.
- If inter-agent handoffs are present, process them before your own tasks.
- When finished, provide a clear summary of what you found and what you did.
- Do NOT hallucinate data — if you need information, use a tool to get it.
`);
    return parts.join("\n");
}
// ----------------------------------------------------------------
// Autonomous Trigger Builder (when no user message)
// ----------------------------------------------------------------
function buildAutonomousTrigger(agentId, context) {
    const triggers = {
        A01: "Run autonomous onboarding check. Review the organization profile for completeness, recommend missing frameworks, and generate workspace seed if needed.",
        A02: "Run autonomous identity & access audit. Check for users needing MFA enforcement, stale access reviews, and role compliance.",
        A03: "Run autonomous framework analysis. Check for unmapped controls, cross-framework gaps, and pending regulatory updates.",
        A04: "Run autonomous control lifecycle check. Review controls for maturity gaps, missing evidence mappings, and RACI completeness.",
        A05: "Run autonomous evidence audit. Identify stale evidence, freshness violations, and controls missing adequate evidence coverage.",
        A06: "Run autonomous remediation planning. Analyze open gaps, generate prioritized roadmaps, and check resource allocation.",
        A07: "Run autonomous risk assessment. Scan for unscored risks, KRI threshold breaches, appetite violations, and generate heatmap analysis.",
        A08: "Run autonomous policy lifecycle check. Review policies for expiry, pending approvals, regulatory alignment, and health scoring.",
        A09: "Run autonomous vendor risk assessment. Check vendor scores, contract expirations, SLA compliance, and fourth-party exposure.",
        A10: "Run autonomous audit & reporting cycle. Generate compliance reports, track certification status, analyze trends, and prepare executive dashboards.",
        A11: "Run autonomous business continuity check. Review BCP plans for completeness, test schedule compliance, RTO/RPO coverage, and crisis readiness gaps.",
        A12: "Run autonomous training & awareness audit. Check training completion rates, overdue certifications, phishing simulation results, and awareness program coverage.",
    };
    const base = triggers[agentId] || "Run your autonomous analysis and reporting cycle.";
    // Add context-specific urgency cues
    const urgencyCues = [];
    if (context.pendingHandoffs > 0)
        urgencyCues.push(`${context.pendingHandoffs} inter-agent handoffs pending.`);
    if (context.highRisks > 0)
        urgencyCues.push(`${context.highRisks} high-severity items need attention.`);
    if (context.overdueItems > 0)
        urgencyCues.push(`${context.overdueItems} items are overdue.`);
    if (urgencyCues.length > 0) {
        return `${base}\n\nUrgent items:\n${urgencyCues.map((c) => `- ${c}`).join("\n")}`;
    }
    return base;
}
//# sourceMappingURL=agent-tool-executor.service.js.map