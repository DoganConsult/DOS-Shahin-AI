// @ts-nocheck
import { logger } from '../../ports/logger.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
const TIER_MODEL_MAP = {
    low: { provider: 'groq', model: 'llama-3.3-70b-versatile' },
    medium: { provider: 'auto', model: 'auto' },
    high: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
    critical: { provider: 'claude', model: 'claude-sonnet-4-20250514' },
};
import { getTaskComplexity as _getRegistryComplexity } from '../../../workflow/services/tasks/task-complexity-registry';
import { getFirstRow } from '@dos/db';
let _configCache = new Map();
let _performanceCache = new Map();
const CACHE_TTL = 60_000;
const PERFORMANCE_CACHE_TTL = 300_000; // 5 minutes
export async function getAgentModelConfig(tenantId, agentId) {
    const key = `${tenantId}:${agentId}`;
    const cached = _configCache.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL)
        return cached.config;
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_model_config WHERE agent_id = $1`, [agentId]);
        if (result.rows.length === 0)
            return null;
        const config = getFirstRow(result);
        _configCache.set(key, { config, ts: Date.now() });
        return config;
    }
    catch {
        return null;
    }
}
export async function upsertAgentModelConfig(tenantId, agentId, updates) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`INSERT INTO "${schema}".agent_model_config (agent_id, preferred_model, preferred_provider, max_tokens, temperature, complexity_tier, fallback_model, fallback_provider, enabled, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (agent_id) DO UPDATE SET
         preferred_model = COALESCE($2, agent_model_config.preferred_model),
         preferred_provider = COALESCE($3, agent_model_config.preferred_provider),
         max_tokens = COALESCE($4, agent_model_config.max_tokens),
         temperature = COALESCE($5, agent_model_config.temperature),
         complexity_tier = COALESCE($6, agent_model_config.complexity_tier),
         fallback_model = COALESCE($7, agent_model_config.fallback_model),
         fallback_provider = COALESCE($8, agent_model_config.fallback_provider),
         enabled = COALESCE($9, agent_model_config.enabled),
         updated_at = NOW()`, [
            agentId,
            updates.preferred_model ?? 'auto',
            updates.preferred_provider ?? 'auto',
            updates.max_tokens ?? 4096,
            updates.temperature ?? 0.3,
            updates.complexity_tier ?? 'medium',
            updates.fallback_model ?? null,
            updates.fallback_provider ?? null,
            updates.enabled ?? true,
        ]);
        _configCache.delete(`${tenantId}:${agentId}`);
        return true;
    }
    catch {
        return false;
    }
}
export function estimateComplexity(taskType, inputTokenEstimate) {
    const baseTier = _getRegistryComplexity(taskType) ?? 'medium';
    if (inputTokenEstimate > 6000 && baseTier === 'medium')
        return 'high';
    if (inputTokenEstimate > 10000)
        return 'critical';
    return baseTier;
}
/**
 * Get performance metrics for a model from cache or database
 */
export async function getModelPerformanceMetrics(tenantId, agentId, provider, model, complexityTier, taskType) {
    const cacheKey = `${tenantId}:${agentId}:${provider}:${model}:${complexityTier}:${taskType || ''}`;
    const cached = _performanceCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < PERFORMANCE_CACHE_TTL) {
        return cached.metrics;
    }
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT provider, model, avg_latency_ms, success_rate, 
              avg_tokens_per_request, cost_per_1k_tokens, sample_count
       FROM "${schema}".agent_model_performance_cache
       WHERE tenant_id = $1 AND agent_id = $2 
         AND provider = $3 AND model = $4 AND complexity_tier = $5
         AND (task_type = $6 OR task_type IS NULL)
       ORDER BY task_type NULLS LAST, last_updated_at DESC
       LIMIT 1`, [tenantId, agentId, provider, model, complexityTier, taskType || null]);
        if (result.rows.length === 0) {
            return null;
        }
        const row = getFirstRow(result);
        const metrics = {
            provider: row.provider,
            model: row.model,
            avgLatencyMs: row.avg_latency_ms,
            successRate: parseFloat(row.success_rate),
            avgTokensPerRequest: row.avg_tokens_per_request,
            costPer1kTokens: row.cost_per_1k_tokens ? parseFloat(row.cost_per_1k_tokens) : undefined,
            sampleCount: row.sample_count,
        };
        _performanceCache.set(cacheKey, { metrics, ts: Date.now() });
        return metrics;
    }
    catch (err) {
        logger.warn(`[LLM Router] Failed to get performance metrics: ${toErrorMessage(err)}`);
        return null;
    }
}
/**
 * Update performance cache with new metrics
 */
export async function updateModelPerformanceCache(tenantId, agentId, provider, model, complexityTier, metrics, taskType) {
    const schema = tenantSchema(tenantId);
    const windowMinutes = 60;
    const windowEnd = new Date();
    const windowStart = new Date(windowEnd.getTime() - windowMinutes * 60 * 1000);
    try {
        // Get existing cache entry or create new
        const existing = await safeQuery(`SELECT cache_id, avg_latency_ms, success_rate, sample_count,
              avg_tokens_per_request, cost_per_1k_tokens
       FROM "${schema}".agent_model_performance_cache
       WHERE tenant_id = $1 AND agent_id = $2 
         AND provider = $3 AND model = $4 AND complexity_tier = $5
         AND (task_type = $6 OR (task_type IS NULL AND $6 IS NULL))
       LIMIT 1`, [tenantId, agentId, provider, model, complexityTier, taskType || null]);
        if (existing.rows.length > 0) {
            // Update existing
            const row = getFirstRow(existing);
            const oldCount = row.sample_count;
            const newCount = oldCount + 1;
            const oldSuccessRate = parseFloat(row.success_rate);
            const newSuccessRate = (oldSuccessRate * oldCount + (metrics.success ? 1 : 0)) / newCount;
            const oldLatency = row.avg_latency_ms;
            const newLatency = Math.round((oldLatency * oldCount + metrics.latencyMs) / newCount);
            const oldTokens = row.avg_tokens_per_request;
            const newTokens = metrics.tokensUsed
                ? Math.round(((oldTokens || 0) * oldCount + metrics.tokensUsed) / newCount)
                : oldTokens;
            await safeQuery(`UPDATE "${schema}".agent_model_performance_cache
         SET avg_latency_ms = $7, success_rate = $8, sample_count = $9,
             avg_tokens_per_request = $10,
             cost_per_1k_tokens = COALESCE($11, cost_per_1k_tokens),
             last_updated_at = NOW(), window_end = $12
         WHERE cache_id = $6`, [
                tenantId,
                agentId,
                provider,
                model,
                complexityTier,
                row.cache_id,
                newLatency,
                newSuccessRate,
                newCount,
                newTokens,
                metrics.costPer1kTokens || null,
                windowEnd,
            ]);
        }
        else {
            // Create new
            await safeQuery(`INSERT INTO "${schema}".agent_model_performance_cache
         (tenant_id, agent_id, provider, model, complexity_tier, task_type,
          avg_latency_ms, success_rate, avg_tokens_per_request, cost_per_1k_tokens,
          sample_count, window_start, window_end)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 1, $11, $12)`, [
                tenantId,
                agentId,
                provider,
                model,
                complexityTier,
                taskType || null,
                metrics.latencyMs,
                metrics.success ? 1.0 : 0.0,
                metrics.tokensUsed || null,
                metrics.costPer1kTokens || null,
                windowStart,
                windowEnd,
            ]);
        }
        // Invalidate cache
        const cacheKey = `${tenantId}:${agentId}:${provider}:${model}:${complexityTier}:${taskType || ''}`;
        _performanceCache.delete(cacheKey);
    }
    catch (err) {
        logger.warn(`[LLM Router] Failed to update performance cache: ${toErrorMessage(err)}`);
    }
}
/**
 * Select best model based on performance cache (adaptive routing)
 */
async function selectBestModelFromCache(tenantId, agentId, complexityTier, taskType, candidateModels) {
    if (!candidateModels || candidateModels.length === 0) {
        return null;
    }
    const schema = tenantSchema(tenantId);
    try {
        // Get performance metrics for all candidates
        const modelList = candidateModels.map((m) => `('${m.provider}', '${m.model}')`).join(',');
        const result = await safeQuery(`SELECT provider, model, avg_latency_ms, success_rate, sample_count
       FROM "${schema}".agent_model_performance_cache
       WHERE tenant_id = $1 AND agent_id = $2 
         AND complexity_tier = $3
         AND (task_type = $4 OR task_type IS NULL)
         AND (provider, model) IN (VALUES ${modelList})
         AND sample_count >= 5
         AND success_rate >= 0.85
       ORDER BY 
         success_rate DESC,
         avg_latency_ms ASC
       LIMIT 1`, [tenantId, agentId, complexityTier, taskType || null]);
        if (result.rows.length > 0) {
            return {
                provider: getFirstRow(result)?.provider,
                model: getFirstRow(result)?.model,
            };
        }
    }
    catch (err) {
        logger.warn(`[LLM Router] Failed to select best model from cache: ${toErrorMessage(err)}`);
    }
    return null;
}
export async function resolveModelForAgent(tenantId, agentId, config, taskType, inputTokenEstimate) {
    if (!config || !config.enabled) {
        return { provider: 'auto', model: 'auto', maxTokens: 4096, temperature: 0.3 };
    }
    let effectiveTier = config.complexity_tier;
    if (taskType && inputTokenEstimate) {
        const dynamicTier = estimateComplexity(taskType, inputTokenEstimate);
        const tierOrder = ['low', 'medium', 'high', 'critical'];
        if (tierOrder.indexOf(dynamicTier) > tierOrder.indexOf(effectiveTier)) {
            effectiveTier = dynamicTier;
        }
    }
    let provider = config.preferred_provider;
    let model = config.preferred_model;
    // If auto, try to use performance cache for adaptive routing
    if ((provider === 'auto' || model === 'auto') && tenantId && agentId) {
        const tierConfig = TIER_MODEL_MAP[effectiveTier];
        const candidates = [
            { provider: tierConfig.provider, model: tierConfig.model },
            ...(config.fallback_provider && config.fallback_model
                ? [{ provider: config.fallback_provider, model: config.fallback_model }]
                : []),
        ];
        const bestModel = await selectBestModelFromCache(tenantId, agentId, effectiveTier, taskType, candidates);
        if (bestModel) {
            if (provider === 'auto')
                provider = bestModel.provider;
            if (model === 'auto')
                model = bestModel.model;
        }
        else {
            // Fallback to tier defaults
            if (provider === 'auto')
                provider = tierConfig.provider;
            if (model === 'auto')
                model = tierConfig.model;
        }
    }
    else if (provider === 'auto' || model === 'auto') {
        const tierConfig = TIER_MODEL_MAP[effectiveTier];
        if (provider === 'auto')
            provider = tierConfig.provider;
        if (model === 'auto')
            model = tierConfig.model;
    }
    return {
        provider,
        model,
        maxTokens: config.max_tokens,
        temperature: config.temperature,
    };
}
export async function getAllAgentModelConfigs(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agent_model_config ORDER BY agent_id`);
        return result.rows;
    }
    catch {
        return [];
    }
}
// ── Legacy wrapper for backward compatibility ────────────────────────
/**
 * Legacy resolveModelForAgent (without tenant/agent for performance cache)
 * Use the async version with tenantId/agentId for adaptive routing
 */
export function resolveModelForAgentLegacy(config, taskType, inputTokenEstimate) {
    if (!config || !config.enabled) {
        return { provider: 'auto', model: 'auto', maxTokens: 4096, temperature: 0.3 };
    }
    let effectiveTier = config.complexity_tier;
    if (taskType && inputTokenEstimate) {
        const dynamicTier = estimateComplexity(taskType, inputTokenEstimate);
        const tierOrder = ['low', 'medium', 'high', 'critical'];
        if (tierOrder.indexOf(dynamicTier) > tierOrder.indexOf(effectiveTier)) {
            effectiveTier = dynamicTier;
        }
    }
    let provider = config.preferred_provider;
    let model = config.preferred_model;
    if (provider === 'auto' || model === 'auto') {
        const tierConfig = TIER_MODEL_MAP[effectiveTier];
        if (provider === 'auto')
            provider = tierConfig.provider;
        if (model === 'auto')
            model = tierConfig.model;
    }
    return {
        provider,
        model,
        maxTokens: config.max_tokens,
        temperature: config.temperature,
    };
}
//# sourceMappingURL=llm-router.service.js.map