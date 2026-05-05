import { logger } from '@dos/platform-core/observability';
// ============================================
// LangGraph Model Adapter
// Wraps existing claude-client.ts with
// @langchain/anthropic ChatAnthropic.
// Supports multi-model routing by task
// complexity and automatic fallback.
// ============================================
import { ChatAnthropic } from '@langchain/anthropic';
import { CLAUDE_MODEL, CLAUDE_MAX_TOKENS } from '../../config/claude-client';
import { toErrorMessage } from '@dos/platform-core/resilience';
let _chatModel = null;
const MODEL_TIERS = {
    simple: {
        modelId: 'claude-haiku-4-5-20251001',
        inputCostPer1M: 0.80,
        outputCostPer1M: 4.00,
        maxTokens: 4096,
    },
    moderate: {
        modelId: 'claude-sonnet-4-6',
        inputCostPer1M: 3.00,
        outputCostPer1M: 15.00,
        maxTokens: 4096,
    },
    complex: {
        modelId: 'claude-opus-4-6',
        inputCostPer1M: 15.00,
        outputCostPer1M: 75.00,
        maxTokens: 4096,
    },
};
/** Fallback order: complex -> moderate -> simple */
const FALLBACK_ORDER = ['complex', 'moderate', 'simple'];
const _costTracker = {
    totalCostUSD: 0,
    callCount: 0,
    byModel: {},
};
/**
 * Estimate cost for a model call based on token counts.
 * Uses published Anthropic pricing per model tier.
 */
export function estimateCost(complexity, inputTokens, outputTokens) {
    const tier = MODEL_TIERS[complexity];
    const inputCost = (inputTokens / 1_000_000) * tier.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * tier.outputCostPer1M;
    return {
        modelId: tier.modelId,
        inputTokens,
        outputTokens,
        estimatedCostUSD: Math.round((inputCost + outputCost) * 1_000_000) / 1_000_000,
    };
}
/**
 * Record a completed call's cost in the accumulator.
 */
export function recordCost(estimate) {
    _costTracker.totalCostUSD += estimate.estimatedCostUSD;
    _costTracker.callCount += 1;
    if (!_costTracker.byModel[estimate.modelId]) {
        _costTracker.byModel[estimate.modelId] = { calls: 0, costUSD: 0 };
    }
    _costTracker.byModel[estimate.modelId].calls += 1;
    _costTracker.byModel[estimate.modelId].costUSD += estimate.estimatedCostUSD;
}
/**
 * Get accumulated cost tracking summary.
 */
export function getCostSummary() {
    return { ..._costTracker, byModel: { ..._costTracker.byModel } };
}
/**
 * Reset cost tracker (useful for per-cycle accounting).
 */
export function resetCostTracker() {
    _costTracker.totalCostUSD = 0;
    _costTracker.callCount = 0;
    _costTracker.byModel = {};
}
// ── Multi-Model Routing ────────────────────────────────────────────────────
/**
 * Select the appropriate model based on task complexity.
 *
 * Routing rules:
 *  - simple  (classification, yes/no)       -> claude-haiku-4-5
 *  - moderate (summarization, extraction)    -> claude-sonnet-4-6
 *  - complex  (reasoning, planning, gen)     -> claude-opus-4-6
 *
 * Returns a ChatAnthropic instance configured for the selected tier.
 */
export function selectModel(taskComplexity, opts) {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        throw new Error('CLAUDE_API_KEY / ANTHROPIC_API_KEY not set');
    const tier = MODEL_TIERS[taskComplexity];
    return new ChatAnthropic({
        model: tier.modelId,
        anthropicApiKey: apiKey,
        maxTokens: opts?.maxTokens ?? tier.maxTokens,
        temperature: opts?.temperature ?? 0.3,
        streaming: opts?.streaming ?? false,
    });
}
/**
 * Invoke a model with automatic fallback on failure.
 * If the primary model fails, tries the next cheaper model in the chain.
 * Tracks cost for each attempt.
 *
 * @param taskComplexity - initial complexity tier
 * @param messages - LangChain message array to invoke with
 * @param opts - optional temperature/maxTokens overrides
 * @returns The model response and cost metadata
 */
export async function invokeWithFallback(taskComplexity, messages, opts) {
    // Build ordered list: start from requested complexity, then fall back to cheaper
    const startIdx = FALLBACK_ORDER.indexOf(taskComplexity);
    const tryOrder = FALLBACK_ORDER.slice(startIdx);
    let lastError = null;
    for (let i = 0; i < tryOrder.length; i++) {
        const complexity = tryOrder[i];
        const model = selectModel(complexity, opts);
        const tier = MODEL_TIERS[complexity];
        try {
            const response = await model.invoke(messages);
            // Estimate cost from usage metadata if available, otherwise approximate
            const inputTokens = response?.usage_metadata?.input_tokens
                ?? response?.response_metadata?.usage?.input_tokens ?? 0;
            const outputTokens = response?.usage_metadata?.output_tokens
                ?? response?.response_metadata?.usage?.output_tokens ?? 0;
            const cost = estimateCost(complexity, inputTokens, outputTokens);
            recordCost(cost);
            return {
                response,
                modelUsed: tier.modelId,
                fallbackUsed: i > 0,
                cost,
            };
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            logger.warn(`[ModelAdapter] ${tier.modelId} failed (${toErrorMessage(err)}), ` +
                (i < tryOrder.length - 1 ? `falling back to ${MODEL_TIERS[tryOrder[i + 1]].modelId}` : 'no more fallbacks'));
        }
    }
    try {
        const { resolveOllamaModel } = require('../../ai/models/ollama-model-router');
        const { createModel } = require('../../ai/models/model-factory');
        const ollamaCategory = taskComplexity === 'simple' ? 'classification'
            : taskComplexity === 'moderate' ? 'extraction' : 'reasoning';
        const ollamaModel = resolveOllamaModel(ollamaCategory);
        const fallbackModel = createModel('ollama', { ...opts, ollamaModel });
        const response = await fallbackModel.invoke(messages);
        const inputTokens = response?.usage_metadata?.input_tokens ?? 0;
        const outputTokens = response?.usage_metadata?.output_tokens ?? 0;
        const cost = estimateCost('simple', inputTokens, outputTokens);
        return { response, modelUsed: `ollama:${ollamaModel}`, fallbackUsed: true, cost };
    }
    catch {
        // Ollama fallback also failed
    }
    throw lastError ?? new Error('All model tiers failed');
}
// ── Original Adapter Functions (preserved) ─────────────────────────────────
/**
 * Returns a shared ChatAnthropic instance configured with
 * the same model/key as the existing claude-client.ts.
 *
 * This adapter bridges our existing Anthropic SDK usage
 * into the LangChain/LangGraph ecosystem.
 */
export function getChatModel(opts) {
    const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
    if (!apiKey)
        throw new Error('CLAUDE_API_KEY / ANTHROPIC_API_KEY not set');
    // Return cached instance for default config
    if (!opts && _chatModel)
        return _chatModel;
    const model = new ChatAnthropic({
        model: CLAUDE_MODEL,
        anthropicApiKey: apiKey,
        maxTokens: opts?.maxTokens ?? CLAUDE_MAX_TOKENS,
        temperature: opts?.temperature ?? 0.3,
        streaming: opts?.streaming ?? false,
    });
    if (!opts)
        _chatModel = model;
    return model;
}
/** Optional overrides when selecting by agent id string (A01, A02, …) */
const AGENT_ID_DEFAULTS = {
    A01: {},
    A02: {},
    A05: {},
};
/**
 * Create a ChatAnthropic instance from agent id (e.g. A01) or explicit temperature/maxTokens.
 */
export function getChatModelForAgent(agentDef) {
    if (typeof agentDef === 'string') {
        const d = AGENT_ID_DEFAULTS[agentDef] ?? {};
        return getChatModel({
            temperature: d.temperature ?? 0.3,
            maxTokens: d.maxTokens ?? CLAUDE_MAX_TOKENS,
        });
    }
    return getChatModel({
        temperature: agentDef.temperature ?? 0.3,
        maxTokens: agentDef.maxTokens ?? CLAUDE_MAX_TOKENS,
    });
}
//# sourceMappingURL=model-adapter.js.map