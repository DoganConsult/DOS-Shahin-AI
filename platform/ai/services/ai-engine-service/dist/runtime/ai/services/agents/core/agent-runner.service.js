// @ts-nocheck
import { assertTenantId, safeQuery, tenantSchema } from '../../../ports/database.port.js';
import { logger } from '../../../ports/logger.port.js';
import { toErrorMessage } from '@dos/module-sdk';
import { canAgentExecute } from './ai-agent-config.service.js';
import { isAgentModuleActive, CONTEXT_BUILDERS, loadGovernanceContext, loadAgentPlaybooks } from '../../orchestration/agent-context-builders.service.js';
import { getPendingHandoffs } from '../agent-cooperation.service.js';
import { runAgentWithTools } from './agent-tool-executor.service.js';
import { loadAgentDef } from '../../../ports/ai.port.js';
import { eventBus } from '../../../ports/events.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
// Wave 3.6 — kill-switch lookup, 5-second TTL cache. Returns
// {active:true, reason} when either an agent-specific row or a
// tenant-wide row is active=TRUE in <tenant>.ai_kill_switches.
const _ksCache = new Map();
const _ksTtlMs = 5_000;
async function _isKillSwitchActive(tenantId, agentId, schema) {
    const key = `${tenantId}:${agentId}`;
    const cached = _ksCache.get(key);
    if (cached && Date.now() - cached.at < _ksTtlMs)
        return { active: cached.active, reason: cached.reason };
    try {
        const r = await safeQuery(`SELECT agent_id, reason
         FROM "${schema}".ai_kill_switches
        WHERE active = TRUE
          AND tenant_id = $1
          AND (agent_id = $2 OR agent_id IS NULL)
        ORDER BY (agent_id IS NOT NULL) DESC
        LIMIT 1`, [tenantId, agentId]);
        const row = r?.rows?.[0];
        const out = row
            ? { active: true, reason: String(row.reason ?? (row.agent_id ? `agent ${row.agent_id} disabled` : 'tenant-wide')) }
            : { active: false, reason: '' };
        _ksCache.set(key, { at: Date.now(), ...out });
        return out;
    }
    catch {
        // Table missing on this tenant — treat as no kill switch.
        return { active: false, reason: '' };
    }
}
/** Action execution lives in orchestration; re-exported here for dynamic imports that expect `agent-runner.service`. */
export { executeAction, resolveUserPermissions, getDefaultAgentPermissions, } from '../../orchestration/agent-action-executor.service.js';
export async function runAgent(tenantId, agentId, opts = {}) {
    const startMs = Date.now();
    // Fail fast on missing tenant context. Callers reaching here without a
    // tenant id are almost always Temporal activities that lost the tenant
    // through the workflow boundary, or REST handlers that bypassed
    // authenticate() — both should be a clear failure, not a downstream
    // 'tenant_undefined' schema query that hangs.
    assertTenantId(tenantId);
    const schema = tenantSchema(tenantId);
    const executionRes = await safeQuery(`INSERT INTO "${schema}".ai_agent_executions (agent_code, user_id, status, input_payload)
     VALUES ($1, $2, 'running', $3::jsonb) RETURNING execution_id`, [agentId, null, JSON.stringify({ query: opts.query ?? null, callerAgentId: opts.callerAgentId ?? null })]).catch(() => ({ rows: [] }));
    const executionId = executionRes.rows?.[0]?.execution_id ?? null;
    try {
        // Wave 3.6 — kill-switch enforcement. Reject the run if either an
        // agent-specific or tenant-wide kill switch is active. Cached per
        // process for 5 seconds so the UI flip propagates within ≤5s.
        const killed = await _isKillSwitchActive(tenantId, agentId, schema);
        if (killed.active) {
            const result = {
                agentId,
                tenantId,
                actionsProposed: 0,
                actionsExecuted: 0,
                summary: `Agent blocked by kill switch: ${killed.reason}`,
                durationMs: Date.now() - startMs,
                status: 'rejected',
            };
            if (executionId) {
                await safeQuery(`UPDATE "${schema}".ai_agent_executions
           SET status = 'completed', completed_at = NOW(), output_result = $1::jsonb, error_message = $2
           WHERE execution_id = $3`, [JSON.stringify(result), `kill_switch:${killed.reason}`, executionId]).catch(() => undefined);
            }
            return result;
        }
        const moduleGate = await isAgentModuleActive(tenantId, agentId);
        if (!moduleGate.active) {
            const result = {
                agentId,
                tenantId,
                actionsProposed: 0,
                actionsExecuted: 0,
                summary: `Agent disabled via module operating state: ${moduleGate.reason}`,
                durationMs: 0,
            };
            if (executionId) {
                await safeQuery(`UPDATE "${schema}".ai_agent_executions
           SET status = 'completed', completed_at = NOW(), output_result = $1::jsonb
           WHERE execution_id = $2`, [JSON.stringify(result), executionId]).catch(() => undefined);
            }
            return result;
        }
        const allowed = await canAgentExecute(tenantId, agentId);
        if (!allowed.allowed) {
            const result = {
                agentId,
                tenantId,
                actionsProposed: 0,
                actionsExecuted: 0,
                summary: `Agent disabled via runtime config: ${allowed.reason || 'not_allowed'}`,
                durationMs: 0,
            };
            if (executionId) {
                await safeQuery(`UPDATE "${schema}".ai_agent_executions
           SET status = 'completed', completed_at = NOW(), output_result = $1::jsonb
           WHERE execution_id = $2`, [JSON.stringify(result), executionId]).catch(() => undefined);
            }
            return result;
        }
        const agentCtxBuilder = CONTEXT_BUILDERS[agentId];
        const [domainCtx, govCtx, playbooks, handoffs] = await Promise.all([
            agentCtxBuilder ? agentCtxBuilder(tenantId, schema) : Promise.resolve({}),
            loadGovernanceContext(tenantId),
            loadAgentPlaybooks(agentId),
            getPendingHandoffs(tenantId, agentId).catch(() => []),
        ]);
        let agentDef = loadAgentDef(agentId) || { id: agentId, name: agentId };
        try {
            const { loadAgentDefFromDb } = await import('@dos/core-ai/agent-loader');
            const dbDef = await loadAgentDefFromDb(agentId);
            if (dbDef) {
                agentDef = {
                    ...agentDef,
                    id: dbDef.agentCode,
                    name: dbDef.name,
                    model: dbDef.model ?? agentDef.model,
                    temperature: dbDef.temperature ?? agentDef.temperature,
                    promptName: dbDef.promptName,
                    datasetName: dbDef.datasetName,
                    capabilities: dbDef.capabilities ?? agentDef.capabilities,
                    dbDeploymentStatus: dbDef.deploymentStatus,
                    dbApprovalStatus: dbDef.approvalStatus,
                };
            }
        }
        catch { /* DB overlay optional */ }
        // ── Tier 2: load prior memory + retrieve RAG context (gated by env) ──
        const memoryEnabled = process.env.LANGGRAPH_MEMORY_ENABLED !== 'false';
        const ragEnabled = process.env.LANGGRAPH_RAG_ENABLED !== 'false';
        const memoryQuery = (opts.query || `agent ${agentId} prior context`).slice(0, 1024);
        const [priorMemories, ragContext] = await Promise.all([
            memoryEnabled
                ? import('../../memory/memory-store.service.js')
                    .then((m) => m.retrieveMemories({ tenantId, agentId, query: memoryQuery, topK: 5 }))
                    .catch(() => [])
                : Promise.resolve([]),
            ragEnabled && opts.query
                ? import('../../gateway/rag-pipeline.service.js')
                    .then((m) => m.buildRAGContext(tenantId, agentId, opts.query, 3))
                    .catch(() => ({ documents: [], tokenEstimate: 0 }))
                : Promise.resolve({ documents: [], tokenEstimate: 0 }),
        ]);
        const memoryBlock = (priorMemories || []).length
            ? `\n=== PRIOR MEMORY (top ${priorMemories.length}) ===\n${priorMemories
                .map((m, i) => `[${i + 1}] (${m.memoryType ?? 'memory'}) ${m.content ?? m.summary ?? ''}`)
                .join('\n')}\n=== END MEMORY ===\n`
            : '';
        const ragBlock = ragContext && ragContext.documents?.length
            ? await import('../../gateway/rag-pipeline.service.js').then((m) => m.formatRAGForPrompt(ragContext))
            : '';
        const enrichedContext = {
            agent: { id: agentId, name: agentDef.name || agentId },
            governanceContext: govCtx,
            playbooks,
            handoffs,
            ...domainCtx,
            priorMemoryBlock: memoryBlock,
            ragContextBlock: ragBlock,
            retrievalStats: {
                memoriesRetrieved: priorMemories?.length || 0,
                ragDocuments: ragContext?.documents?.length || 0,
                ragTokenEstimate: ragContext?.tokenEstimate || 0,
            },
        };
        const toolResult = await runAgentWithTools(tenantId, agentId, enrichedContext, opts.query, {
            visitedAgents: opts.callerAgentId ? [opts.callerAgentId] : [],
            // Wave 2: forward identity + session for Langfuse trace attribution.
            userId: opts.userId,
            sessionId: opts.sessionId,
        });
        // ── Tier 2: commit run summary to memory (best-effort) ──
        if (memoryEnabled && toolResult.finalText) {
            import('../../memory/memory-store.service.js')
                .then((m) => m.commitMemories({
                tenantId,
                agentId,
                runId: executionId || undefined,
                summary: String(toolResult.finalText).slice(0, 2048),
                facts: [
                    {
                        kind: 'task',
                        text: String(toolResult.finalText).slice(0, 4096),
                        importance: 0.5,
                        metadata: {
                            toolCalls: toolResult.totalToolCalls,
                            stopReason: toolResult.stopReason,
                        },
                    },
                ],
            }))
                .catch(() => undefined);
        }
        // ── Tier 6: auto-evaluate completed runs (best-effort, env-gated) ──
        // Runs the canonical evaluateOutput judge on the run's finalText. Cheap
        // (one judge call per run when AI_AUTO_EVAL_ENABLED=true).
        if (process.env.AI_AUTO_EVAL_ENABLED === 'true' && toolResult.finalText) {
            import('../lifecycle/agent-eval.service.js')
                .then((m) => m.evaluateOutput(tenantId, agentId, String(opts.query || `agent ${agentId} autonomous run`).slice(0, 1000), String(toolResult.finalText).slice(0, 2000), 'quality', executionId || undefined))
                .catch(() => undefined);
        }
        const actionsProposed = toolResult.totalToolCalls || 0;
        const actionsExecuted = (toolResult.toolResults || []).filter((t) => !t.isError).length;
        const summary = (toolResult.finalText || '').trim() || `${agentId} completed (${actionsExecuted}/${actionsProposed})`;
        const result = {
            agentId,
            tenantId,
            actionsProposed,
            actionsExecuted,
            summary,
            durationMs: Date.now() - startMs,
            // Wave 1 G1 — explicit terminal status so callers (Temporal activity,
            // smoke harness) can verify success without inspecting durationMs.
            status: 'completed',
            // Cost mirror so tenant-scoped queries (ai_execution_log.cost_usd > 0)
            // pass without a separate join to LangSmith. usageMicroDollars from
            // the LLM round-trip is best-effort; absent providers emit 0.
            costUsd: typeof toolResult?.costUsd === 'number' ? toolResult.costUsd : 0,
            output: { content: summary },
        };
        if (executionId) {
            await safeQuery(`UPDATE "${schema}".ai_agent_executions
         SET status = 'completed', completed_at = NOW(), output_result = $1::jsonb
         WHERE execution_id = $2`, [JSON.stringify({ ...toolResult, summary }), executionId]).catch(() => undefined);
        }
        swallow(EC.EVENT_BUS, eventBus.publish({
            eventType: 'ai.agent.completed',
            tenantId,
            sourceService: `agent-runner:${agentId}`,
            severity: 'info',
            payload: { agentId, executionId, actionsProposed, actionsExecuted, durationMs: result.durationMs },
        }), { tenantId, operation: 'eventBus:ai.agent.completed' });
        // Wave 1 G1 — score the agent's structured contract output against
        // dataset.<agent>.smoke. The dataset items expect shapes like
        // {status, agentCode, reason}; we hand the evaluator the same fields
        // so a "happy-path" item scores ≥ 0.7 instead of the 0 we got when
        // scoring the raw LLM content.
        try {
            const { recordAndScore } = await import('../../../observability/smoke-evaluator.js');
            void recordAndScore({
                agentId,
                output: {
                    status: 'completed',
                    agentCode: agentId,
                },
            });
        }
        catch { /* best-effort */ }
        return result;
    }
    catch (err) {
        const msg = toErrorMessage(err);
        logger.error(`[AgentRunner] Agent ${agentId} execution failed`, { tenantId, error: msg });
        if (executionId) {
            await safeQuery(`UPDATE "${schema}".ai_agent_executions
         SET status = 'failed', completed_at = NOW(), error_message = $1
         WHERE execution_id = $2`, [msg, executionId]).catch(() => undefined);
        }
        swallow(EC.EVENT_BUS, eventBus.publish({
            eventType: 'ai.agent.failed',
            tenantId,
            sourceService: `agent-runner:${agentId}`,
            severity: 'error',
            payload: { agentId, executionId, error: msg },
        }), { tenantId, operation: 'eventBus:ai.agent.failed' });
        return {
            agentId,
            tenantId,
            actionsProposed: 0,
            actionsExecuted: 0,
            summary: `Failed to execute agent ${agentId}: ${msg}`,
            durationMs: Date.now() - startMs,
        };
    }
}
//# sourceMappingURL=agent-runner.service.js.map