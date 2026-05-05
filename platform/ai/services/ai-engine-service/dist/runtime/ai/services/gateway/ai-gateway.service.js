// @ts-nocheck
import { logger } from '../../ports/logger.port';
// ============================================
// AI Gateway Service — Centralized LLM Access
// All modules MUST use this service instead of
// importing claude-client helpers directly.
//
// Routes through llm.service.ts multi-provider
// fallback chain: Claude → Azure → Free → Ollama
//
// Features:
//  - Per-tenant concurrency limiting
//  - Exponential backoff retries (429/500/503)
//  - Circuit breaker per provider
//  - Cost alert notifications at 80% budget
//  - Provider health monitoring
// ============================================
import { toErrorMessage } from '@dos/module-sdk';
// ── Per-tenant concurrency control ─────────────────────────────
const DEFAULT_MAX_CONCURRENT = 5;
const tenantInflight = new Map();
const tenantQueue = new Map();
const tenantLimits = new Map();
function getMaxConcurrent(tenantId) {
    return tenantLimits.get(tenantId) ?? DEFAULT_MAX_CONCURRENT;
}
export function setTenantConcurrencyLimit(tenantId, limit) {
    tenantLimits.set(tenantId, limit);
}
async function acquireSlot(tenantId) {
    const current = tenantInflight.get(tenantId) ?? 0;
    const max = getMaxConcurrent(tenantId);
    if (current < max) {
        tenantInflight.set(tenantId, current + 1);
        return;
    }
    return new Promise((resolve) => {
        const queue = tenantQueue.get(tenantId) ?? [];
        queue.push(resolve);
        tenantQueue.set(tenantId, queue);
    });
}
function releaseSlot(tenantId) {
    const queue = tenantQueue.get(tenantId);
    if (queue && queue.length > 0) {
        const next = queue.shift();
        if (queue.length === 0)
            tenantQueue.delete(tenantId);
        next();
    }
    else {
        const current = tenantInflight.get(tenantId) ?? 1;
        tenantInflight.set(tenantId, Math.max(0, current - 1));
    }
}
const circuitBreakers = new Map();
const CIRCUIT_FAILURE_THRESHOLD = 5;
const CIRCUIT_OPEN_DURATION_MS = 60_000;
function checkCircuit(provider) {
    const state = circuitBreakers.get(provider);
    if (state && Date.now() < state.openUntil) {
        throw new Error(`AI_GATEWAY_CIRCUIT_OPEN: ${provider} circuit breaker is open. Retry after ${new Date(state.openUntil).toISOString()}`);
    }
}
function recordSuccess(provider) {
    circuitBreakers.delete(provider);
}
function recordFailure(provider) {
    const state = circuitBreakers.get(provider) ?? { consecutiveFailures: 0, openUntil: 0 };
    state.consecutiveFailures++;
    if (state.consecutiveFailures >= CIRCUIT_FAILURE_THRESHOLD) {
        state.openUntil = Date.now() + CIRCUIT_OPEN_DURATION_MS;
        logger.warn(`[AIGateway] Circuit breaker OPEN for ${provider} — ${state.consecutiveFailures} consecutive failures`);
    }
    circuitBreakers.set(provider, state);
}
// ── Retry with exponential backoff + jitter ─────────────────────
const RETRYABLE_STATUS_CODES = [429, 500, 503];
const MAX_RETRIES = 3;
const BACKOFF_BASE_MS = 1000;
const retryMetrics = new Map();
function isRetryable(err) {
    const status = err?.status ?? err?.statusCode ?? err?.error?.status;
    if (status && RETRYABLE_STATUS_CODES.includes(status))
        return true;
    if (err?.message?.includes('rate_limit'))
        return true;
    if (err?.message?.includes('overloaded'))
        return true;
    return false;
}
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
/**
 * Calculate exponential backoff with jitter (full jitter strategy)
 * Jitter helps prevent thundering herd problem
 */
function calculateBackoffWithJitter(attempt, baseMs) {
    const exponentialDelay = baseMs * Math.pow(2, attempt);
    // Full jitter: random between 0 and exponential delay
    const jitter = Math.random() * exponentialDelay;
    return Math.floor(jitter);
}
/**
 * Get retry metrics for a provider (for observability)
 */
export function getRetryMetrics(provider) {
    return retryMetrics.get(provider) || [];
}
/**
 * Clear retry metrics for a provider
 */
export function clearRetryMetrics(provider) {
    retryMetrics.delete(provider);
}
async function withRetry(fn, provider) {
    checkCircuit(provider);
    // Initialize metrics array for this provider if needed
    if (!retryMetrics.has(provider)) {
        retryMetrics.set(provider, []);
    }
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
            const result = await fn();
            recordSuccess(provider);
            // Clear metrics on success
            clearRetryMetrics(provider);
            return result;
        }
        catch (err) {
            const errorMsg = toErrorMessage(err);
            if (attempt < MAX_RETRIES && isRetryable(err)) {
                // Calculate delay with jitter
                const delayMs = calculateBackoffWithJitter(attempt, BACKOFF_BASE_MS);
                // Record retry metrics
                const metrics = retryMetrics.get(provider);
                metrics.push({
                    attempt: attempt + 1,
                    delayMs,
                    error: errorMsg,
                    timestamp: new Date(),
                });
                logger.warn(`[AIGateway] Retry ${attempt + 1}/${MAX_RETRIES} for ${provider} after ${delayMs}ms (with jitter) — ${errorMsg}`);
                await sleep(delayMs);
                continue;
            }
            // All retries exhausted - record final failure
            const metrics = retryMetrics.get(provider);
            metrics.push({
                attempt: attempt + 1,
                delayMs: 0,
                error: errorMsg,
                timestamp: new Date(),
            });
            recordFailure(provider);
            throw err;
        }
    }
    throw new Error('AI_GATEWAY_MAX_RETRIES: Should not reach here');
}
// ── Multi-provider completion via llm.service ──────────────────
async function multiProviderComplete(systemPrompt, userMessage, _maxTokens, _temperature) {
    const { chatCompletion } = await import('./llm.service');
    const messages = [];
    if (systemPrompt)
        messages.push({ role: 'system', content: systemPrompt });
    messages.push({ role: 'user', content: userMessage });
    const result = await chatCompletion(messages);
    if (result.provider === 'none') {
        throw new Error(`[AIGateway] All LLM providers failed: ${result.content}`);
    }
    return result.content;
}
async function multiProviderChat(systemPrompt, messages, _opts) {
    const { chatCompletion } = await import('./llm.service');
    const llmMessages = [];
    if (systemPrompt)
        llmMessages.push({ role: 'system', content: systemPrompt });
    for (const m of messages) {
        llmMessages.push({ role: m.role, content: m.content });
    }
    const result = await chatCompletion(llmMessages);
    if (result.provider === 'none') {
        throw new Error(`[AIGateway] All LLM providers failed: ${result.content}`);
    }
    return result.content;
}
async function multiProviderJSON(systemPrompt, userMessage, maxTokens) {
    const jsonPrompt = systemPrompt + "\n\nIMPORTANT: Respond ONLY with valid JSON. No markdown, no explanation.";
    const raw = await multiProviderComplete(jsonPrompt, userMessage, maxTokens);
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    return JSON.parse(cleaned);
}
export async function gatewayComplete(opts) {
    const { tenantId } = opts;
    await acquireSlot(tenantId);
    try {
        return await withRetry(() => multiProviderComplete(opts.systemPrompt, opts.userMessage, opts.maxTokens, opts.temperature), 'multi-provider');
    }
    finally {
        releaseSlot(tenantId);
    }
}
export async function gatewayChat(tenantId, systemPrompt, messages, opts) {
    await acquireSlot(tenantId);
    try {
        return await withRetry(() => multiProviderChat(systemPrompt, messages, opts), 'multi-provider');
    }
    finally {
        releaseSlot(tenantId);
    }
}
export async function gatewayJSON(opts) {
    const { tenantId } = opts;
    await acquireSlot(tenantId);
    try {
        return await withRetry(() => multiProviderJSON(opts.systemPrompt, opts.userMessage, opts.maxTokens), 'multi-provider');
    }
    finally {
        releaseSlot(tenantId);
    }
}
export async function gatewayWithTools(tenantId, opts) {
    await acquireSlot(tenantId);
    try {
        return await withRetry(async () => {
            try {
                const { claudeWithTools } = await import('../../../../config/claude-client');
                return await claudeWithTools(opts);
            }
            catch (claudeErr) {
                logger.warn(`[AIGateway] Claude tool_use failed: ${toErrorMessage(claudeErr)} — falling back to text-based tool dispatch`);
                const toolNames = opts.tools.map(t => t.name).join(', ');
                const prompt = opts.systemPrompt + `\n\nAvailable tools: ${toolNames}\n\nYou MUST respond with a JSON object containing a "tool_calls" array with objects having "name" and "input" fields, OR a "text" field with your response.`;
                const lastMsg = opts.messages[opts.messages.length - 1];
                const userContent = typeof lastMsg?.content === 'string' ? lastMsg.content : JSON.stringify(lastMsg?.content);
                const raw = await multiProviderComplete(prompt, userContent || '(continue)');
                const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
                try {
                    const parsed = JSON.parse(cleaned);
                    const toolCalls = (parsed.tool_calls || []).map((tc, i) => ({
                        id: `fallback_${Date.now()}_${i}`,
                        name: tc.name,
                        input: tc.input || {},
                    }));
                    return {
                        stopReason: toolCalls.length > 0 ? 'tool_use' : 'end_turn',
                        textBlocks: parsed.text ? [parsed.text] : [],
                        toolCalls,
                        rawContent: [],
                        usage: { inputTokens: 0, outputTokens: 0 },
                    };
                }
                catch {
                    return {
                        stopReason: 'end_turn',
                        textBlocks: [raw],
                        toolCalls: [],
                        rawContent: [],
                        usage: { inputTokens: 0, outputTokens: 0 },
                    };
                }
            }
        }, 'multi-provider');
    }
    finally {
        releaseSlot(tenantId);
    }
}
// ── Slot management for streaming callers ────────────────────────
export async function gatewayAcquireSlot(tenantId) {
    await acquireSlot(tenantId);
}
export function gatewayReleaseSlot(tenantId) {
    releaseSlot(tenantId);
}
export function getGatewayHealth() {
    const circuit = circuitBreakers.get('multi-provider');
    let totalInflight = 0;
    let totalQueued = 0;
    for (const v of tenantInflight.values())
        totalInflight += v;
    for (const q of tenantQueue.values())
        totalQueued += q.length;
    return {
        provider: 'multi-provider',
        circuitOpen: circuit ? Date.now() < circuit.openUntil : false,
        consecutiveFailures: circuit?.consecutiveFailures ?? 0,
        openUntil: circuit?.openUntil ? new Date(circuit.openUntil).toISOString() : null,
        activeTenants: tenantInflight.size,
        totalInflight,
        totalQueued,
    };
}
export const gatewayText = (..._args) => { return {}; };
//# sourceMappingURL=ai-gateway.service.js.map