// AI-OS Wave 2 — LangSmith observability bridge.
//
// Posts a single LLM-call run to LangSmith's ingest API per callClaude().
// Runs alongside the existing Langfuse bridge so the platform can be
// migrated between the two without dual-instrumentation churn.
//
// All operations are best-effort: any network error is swallowed with a
// warn-level log so a flaky LangSmith endpoint never crashes an agent run.
//
// Activation: set LANGSMITH_TRACING=true and LANGSMITH_API_KEY. When
// either is missing this module is a no-op.
import { randomUUID } from 'node:crypto';
import { logger } from '../ports/logger.port';
// LangSmith expects dotted_order = "<UTC YYYYMMDDTHHMMSSffffffZ><uuid>"
// for root runs. Microseconds are zero-padded; the suffix is the run id.
function dottedOrderFor(startedAt, runId) {
    const d = new Date(startedAt);
    const pad = (n, w = 2) => String(n).padStart(w, '0');
    const yyyy = d.getUTCFullYear();
    const mm = pad(d.getUTCMonth() + 1);
    const dd = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mi = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    const us = pad(d.getUTCMilliseconds() * 1000, 6);
    return `${yyyy}${mm}${dd}T${hh}${mi}${ss}${us}Z${runId}`;
}
function isEnabled() {
    return ((process.env.LANGSMITH_TRACING === 'true' || process.env.LANGSMITH_TRACING === '1') &&
        !!process.env.LANGSMITH_API_KEY);
}
async function postBatch(payload) {
    if (!isEnabled())
        return;
    const endpoint = (process.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com').replace(/\/$/, '');
    try {
        const res = await fetch(`${endpoint}/runs/batch`, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                'x-api-key': process.env.LANGSMITH_API_KEY,
            },
            body: JSON.stringify(payload),
        });
        if (!res.ok && res.status !== 202) {
            const body = await res.text().catch(() => '');
            logger.warn(`[langsmith-bridge] ingest returned ${res.status}: ${body.slice(0, 200)}`);
        }
    }
    catch (err) {
        logger.warn(`[langsmith-bridge] ingest failed: ${err.message}`);
    }
}
/**
 * Record one LLM round-trip as a LangSmith run. Returns immediately on
 * any failure path so the caller never observes a slow ingest.
 */
export async function recordLlmRun(rec) {
    if (!isEnabled())
        return;
    const session = process.env.LANGSMITH_PROJECT || 'default';
    const id = randomUUID();
    const post = {
        id,
        trace_id: id,
        dotted_order: dottedOrderFor(rec.startedAt, id),
        name: `llm.${rec.agentId || 'direct'}`,
        run_type: 'llm',
        inputs: {
            messages: [
                ...(rec.systemPrompt ? [{ role: 'system', content: rec.systemPrompt.slice(0, 4000) }] : []),
                ...(rec.userMessage ? [{ role: 'user', content: rec.userMessage.slice(0, 4000) }] : []),
            ],
            model: rec.model,
        },
        outputs: rec.error
            ? undefined
            : {
                content: rec.content.slice(0, 4000),
                stop_reason: rec.stopReason,
                usage: { prompt_tokens: rec.inputTokens, completion_tokens: rec.outputTokens },
            },
        error: rec.error,
        start_time: new Date(rec.startedAt).toISOString(),
        end_time: new Date(rec.endedAt).toISOString(),
        extra: {
            runtime: 'ai-engine-service',
            agentId: rec.agentId,
        },
        session_name: session,
        tags: rec.tags || ['ai-engine', `agent:${rec.agentId || 'direct'}`],
    };
    await postBatch({ post: [post] });
}
//# sourceMappingURL=langsmith-bridge.js.map