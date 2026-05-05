import { logger } from '../../ports/logger.port';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { CLAUDE_MODEL } from '../../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import { DEFAULT_FREE_ORDER, buildFreeProvider, callClaude, callAzureOpenAI, callFreeProvider as callFree, callOllama, } from './llm-providers';
function loadConfig() {
    const configPath = resolve(__dirname, '../../../config/llm-config.json');
    if (existsSync(configPath)) {
        const raw = JSON.parse(readFileSync(configPath, 'utf-8'));
        const rawFree = raw.freeProviders || {};
        const freeProviders = {};
        for (const name of DEFAULT_FREE_ORDER) {
            const built = buildFreeProvider(name, rawFree[name]);
            if (built)
                freeProviders[name] = built;
        }
        return {
            provider: raw.provider || process.env.AI_PROVIDER || 'auto',
            claude: process.env.CLAUDE_API_KEY
                ? { apiKey: process.env.CLAUDE_API_KEY, model: process.env.CLAUDE_MODEL || CLAUDE_MODEL }
                : raw.claude || undefined,
            azure: raw.azure
                ? {
                    endpoint: raw.azure.endpoint || process.env.AZURE_OPENAI_ENDPOINT || '',
                    apiKey: raw.azure.apiKey || process.env.AZURE_OPENAI_API_KEY || '',
                    apiVersion: raw.azure.apiVersion || process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
                    deploymentName: raw.azure.deploymentName,
                }
                : undefined,
            ollama: raw.ollama
                ? { endpoint: raw.ollama.endpoint || 'http://localhost:11434', model: raw.ollama.model || 'llama3.2:3b' }
                : undefined,
            freeProviders: Object.keys(freeProviders).length > 0 ? freeProviders : undefined,
            freeProviderOrder: raw.freeProviderOrder || DEFAULT_FREE_ORDER,
            maxTokens: raw.maxTokens || 4096,
            enabled: raw.enabled !== false,
        };
    }
    const freeProviders = {};
    for (const name of DEFAULT_FREE_ORDER) {
        const built = buildFreeProvider(name, undefined);
        if (built)
            freeProviders[name] = built;
    }
    return {
        provider: process.env.AI_PROVIDER || 'auto',
        claude: process.env.CLAUDE_API_KEY
            ? { apiKey: process.env.CLAUDE_API_KEY, model: process.env.CLAUDE_MODEL || CLAUDE_MODEL }
            : undefined,
        azure: process.env.AZURE_OPENAI_ENDPOINT
            ? {
                endpoint: process.env.AZURE_OPENAI_ENDPOINT,
                apiKey: process.env.AZURE_OPENAI_API_KEY || '',
                apiVersion: process.env.AZURE_OPENAI_API_VERSION || '2024-12-01-preview',
            }
            : undefined,
        ollama: { endpoint: 'http://localhost:11434', model: 'llama3.2:3b' },
        freeProviders: Object.keys(freeProviders).length > 0 ? freeProviders : undefined,
        freeProviderOrder: DEFAULT_FREE_ORDER,
        maxTokens: 4096,
        enabled: true,
    };
}
const _agentProfiles = [];
export function registerAgentProfiles(profiles) {
    _agentProfiles.length = 0;
    _agentProfiles.push(...profiles);
}
export const AGENT_PROFILES = _agentProfiles;
/**
 * Send a chat completion request.
 * Fallback chain: Claude → Azure OpenAI → Free Providers (in configured order) → Ollama.
 * If provider is set to a specific free provider name, only that one is tried.
 * If provider is "free-first", free providers are tried before premium.
 */
export async function chatCompletion(messages, agentId, routerOverrides) {
    const config = loadConfig();
    if (!config.enabled) {
        return { content: "LLM is disabled in configuration.", provider: "none", model: "none", latencyMs: 0 };
    }
    if (routerOverrides?.maxTokens)
        config.maxTokens = routerOverrides.maxTokens;
    const start = Date.now();
    let provider = config.provider;
    if (routerOverrides?.provider && routerOverrides.provider !== 'auto') {
        provider = routerOverrides.provider;
    }
    // --- Resolve task-specific Ollama model for agent ---
    let ollamaModelForAgent;
    if (agentId) {
        try {
            const { resolveOllamaModelForAgent } = require('../../../../ai/models/ollama-model-router');
            ollamaModelForAgent = resolveOllamaModelForAgent(agentId);
        }
        catch { /* non-fatal */ }
    }
    // --- Direct free provider selection ---
    const allFreeNames = [
        "groq", "gemini", "openrouter", "together", "cerebras", "mistral", "deepseek", "sambanova",
    ];
    if (allFreeNames.includes(provider)) {
        const fp = config.freeProviders?.[provider];
        if (fp?.enabled && fp.apiKey) {
            try {
                const result = await callFree(provider, fp, messages, config.maxTokens);
                return { ...result, latencyMs: Date.now() - start };
            }
            catch (err) {
                logger.warn(`[LLM] ${provider} failed (agent ${agentId || "?"}): ${toErrorMessage(err)}`);
            }
        }
        return {
            content: `Free provider '${provider}' is not configured or not enabled.`,
            provider: "none", model: "none", latencyMs: Date.now() - start,
        };
    }
    // --- "free-first" mode: Free → Claude → Azure → Ollama ---
    if (provider === "free-first") {
        // Try free providers first
        const order = config.freeProviderOrder || DEFAULT_FREE_ORDER;
        for (const name of order) {
            const fp = config.freeProviders?.[name];
            if (!fp?.enabled || !fp.apiKey)
                continue;
            try {
                const result = await callFree(name, fp, messages, config.maxTokens);
                return { ...result, latencyMs: Date.now() - start };
            }
            catch (err) {
                logger.warn(`[LLM] Free:${name} failed (agent ${agentId || "?"}): ${toErrorMessage(err)}`);
            }
        }
        // Then premium
        if (config.claude?.apiKey) {
            try {
                const result = await callClaude(messages, config.claude.model, config.maxTokens);
                return { ...result, latencyMs: Date.now() - start };
            }
            catch (err) {
                logger.warn(`[LLM] Claude failed (agent ${agentId || "?"}): ${toErrorMessage(err)}`);
            }
        }
        if (config.azure?.endpoint && config.azure?.apiKey) {
            try {
                const result = await callAzureOpenAI(config.azure, messages, config.maxTokens);
                return { ...result, latencyMs: Date.now() - start };
            }
            catch (err) {
                logger.warn(`[LLM] Azure failed (agent ${agentId || "?"}): ${toErrorMessage(err)}`);
            }
        }
        // Then Ollama
        if (config.ollama) {
            try {
                const result = await callOllama(config.ollama, messages, ollamaModelForAgent);
                return { ...result, latencyMs: Date.now() - start };
            }
            catch (err) {
                logger.warn(`[LLM] Ollama failed (agent ${agentId || "?"}): ${toErrorMessage(err)}`);
            }
        }
        return {
            content: "No LLM provider available. Configure free/premium providers or Ollama.",
            provider: "none", model: "none", latencyMs: Date.now() - start,
        };
    }
    // --- Default "auto" / "claude" / "azure-openai" mode: Claude → Azure → Free → Ollama ---
    // 1. Try Claude first (primary)
    if ((provider === "claude" || provider === "auto") && config.claude?.apiKey) {
        try {
            const result = await callClaude(messages, config.claude.model, config.maxTokens);
            return { ...result, latencyMs: Date.now() - start };
        }
        catch (err) {
            logger.warn(`[LLM] Claude failed (agent ${agentId || "?"}): ${toErrorMessage(err)}, falling back`);
        }
    }
    // 2. Try Azure OpenAI (secondary)
    if ((provider === "azure-openai" || provider === "auto") && config.azure?.endpoint && config.azure?.apiKey) {
        try {
            const result = await callAzureOpenAI(config.azure, messages, config.maxTokens);
            return { ...result, latencyMs: Date.now() - start };
        }
        catch (err) {
            logger.warn(`[LLM] Azure OpenAI failed (agent ${agentId || "?"}): ${toErrorMessage(err)}, trying free providers`);
        }
    }
    // 3. Try free providers (in configured order)
    if (provider === "auto" && config.freeProviders) {
        const order = config.freeProviderOrder || DEFAULT_FREE_ORDER;
        for (const name of order) {
            const fp = config.freeProviders[name];
            if (!fp?.enabled || !fp.apiKey)
                continue;
            try {
                const result = await callFree(name, fp, messages, config.maxTokens);
                return { ...result, latencyMs: Date.now() - start };
            }
            catch (err) {
                logger.warn(`[LLM] Free:${name} failed (agent ${agentId || "?"}): ${toErrorMessage(err)}`);
            }
        }
    }
    // 4. Try Ollama (local fallback)
    if ((provider === "ollama" || provider === "auto") && config.ollama) {
        try {
            const result = await callOllama(config.ollama, messages, ollamaModelForAgent);
            return { ...result, latencyMs: Date.now() - start };
        }
        catch (err) {
            logger.warn(`[LLM] Ollama failed (agent ${agentId || "?"}): ${toErrorMessage(err)}`);
        }
    }
    return {
        content: "No LLM provider is available. Check Claude, Azure OpenAI, free providers, and Ollama configuration.",
        provider: "none",
        model: "none",
        latencyMs: Date.now() - start,
    };
}
/**
 * Enhanced chat completion with caching, tracing, usage tracking, and budget checks.
 */
export async function enhancedChatCompletion(messages, opts) {
    const tenantId = opts?.tenantId;
    const agentId = opts?.agentId;
    if (tenantId) {
        try {
            const { checkBudgetAllowance } = await import('./llm-usage-tracker.service');
            const budget = await checkBudgetAllowance(tenantId);
            if (!budget.allowed) {
                return { content: budget.reason || 'Budget exceeded', provider: 'none', model: 'none', latencyMs: 0 };
            }
        }
        catch { /* non-fatal */ }
    }
    try {
        const { getCachedLLMResponse } = await import('../llm/llm-cache.service');
        const cached = await getCachedLLMResponse(messages, agentId || 'default');
        if (cached) {
            return { content: cached.content, provider: cached.provider, model: cached.model, latencyMs: 0 };
        }
    }
    catch { /* non-fatal */ }
    let routerOverrides;
    if (opts?.governedModelOverrides) {
        routerOverrides = opts.governedModelOverrides;
    }
    else if (tenantId && agentId) {
        try {
            const { getAgentModelConfig, resolveModelForAgent } = await import('./llm-router.service');
            const modelCfg = await getAgentModelConfig(tenantId, agentId);
            if (modelCfg) {
                const inputTokenEstimate = messages.reduce((s, m) => s + Math.ceil(m.content.length / 4), 0);
                routerOverrides = await resolveModelForAgent(tenantId, agentId, modelCfg, undefined, inputTokenEstimate);
            }
        }
        catch { /* llm-router non-fatal */ }
    }
    const traceId = tenantId ? (() => { try {
        const { createTraceId } = require('../llm/llm-trace.service');
        return createTraceId();
    }
    catch {
        return undefined;
    } })() : undefined;
    const start = Date.now();
    const result = await chatCompletion(messages, agentId, routerOverrides);
    const latencyMs = Date.now() - start;
    if (tenantId) {
        try {
            const { trackUsage } = await import('./llm-usage-tracker.service');
            await trackUsage({
                tenantId, userId: opts?.userId, agentId, runId: opts?.runId,
                provider: result.provider, model: result.model,
                inputTokens: result.tokensUsed ? Math.floor(result.tokensUsed * 0.7) : 0,
                outputTokens: result.tokensUsed ? Math.ceil(result.tokensUsed * 0.3) : 0,
                latencyMs,
            });
        }
        catch { /* non-fatal */ }
        try {
            const { recordTrace } = await import('../llm/llm-trace.service');
            await recordTrace({
                traceId, tenantId, agentId, userId: opts?.userId, runId: opts?.runId,
                operation: 'chat', provider: result.provider, model: result.model,
                inputPreview: messages[messages.length - 1]?.content,
                outputPreview: result.content,
                inputTokens: result.tokensUsed ? Math.floor(result.tokensUsed * 0.7) : 0,
                outputTokens: result.tokensUsed ? Math.ceil(result.tokensUsed * 0.3) : 0,
                latencyMs,
                status: result.provider === 'none' ? 'error' : 'ok',
            });
        }
        catch { /* non-fatal */ }
    }
    try {
        const { setCachedLLMResponse } = await import('../llm/llm-cache.service');
        await setCachedLLMResponse(messages, agentId || 'default', {
            content: result.content, provider: result.provider, model: result.model,
        });
    }
    catch { /* non-fatal */ }
    return result;
}
/**
 * Agent-specific chat completion with system prompt injected.
 * Enhanced with prompt versioning, bilingual support, RAG, and injection guard.
 */
export async function agentChat(agentId, userMessage, context, opts) {
    let systemPrompt;
    let governedModelOverrides;
    if (opts?.tenantId) {
        try {
            const { resolveGovernedAgent } = await import('./agent-governance-bridge.service');
            const agentResolution = await resolveGovernedAgent(opts.tenantId, agentId);
            if (agentResolution.governed && agentResolution.resolved_system_prompt) {
                systemPrompt = agentResolution.resolved_system_prompt;
            }
            else {
                systemPrompt = '';
            }
            if (agentResolution.governed && agentResolution.resolved_model) {
                governedModelOverrides = {
                    provider: agentResolution.resolved_model.provider,
                    model: agentResolution.resolved_model.provider_model_id,
                    maxTokens: agentResolution.resolved_model.config?.max_tokens,
                    temperature: agentResolution.resolved_model.config?.temperature,
                };
            }
            if (agentResolution.resolution_status === 'blocked_enforce') {
                return { content: 'Agent governance check failed: ' + (agentResolution.warnings[0] || 'blocked'), provider: 'governance', model: 'none', latencyMs: 0 };
            }
        }
        catch {
            systemPrompt = '';
        }
        if (!systemPrompt) {
            try {
                const { resolveActivePromptForAgent } = await import('../../../ai-governance/services/misc/prompt-registry.service');
                const activeVersion = await resolveActivePromptForAgent(opts.tenantId, agentId);
                systemPrompt = activeVersion?.template_text || '';
            }
            catch {
                const agent = AGENT_PROFILES.find((a) => a.id === agentId);
                systemPrompt = agent?.systemPrompt || "You are a helpful GRC assistant.";
            }
        }
        if (!systemPrompt) {
            const agent = AGENT_PROFILES.find((a) => a.id === agentId);
            systemPrompt = agent?.systemPrompt || "You are a helpful GRC assistant.";
        }
        try {
            const { getLanguageAwarePrompt } = await import('../../platform/services/misc/bilingual-prompt.service');
            const bilingualPrompt = getLanguageAwarePrompt(agentId, userMessage);
            if (bilingualPrompt && bilingualPrompt.length > systemPrompt.length) {
                systemPrompt = bilingualPrompt;
            }
        }
        catch { /* non-fatal */ }
        try {
            const { guardInput } = await import('./prompt-injection-guard.service');
            const guard = await guardInput(opts.tenantId, userMessage, opts.userId, agentId);
            if (!guard.allowed) {
                return { content: `Input blocked: ${guard.warning}`, provider: 'guard', model: 'none', latencyMs: 0 };
            }
            userMessage = guard.sanitizedInput;
        }
        catch { /* non-fatal */ }
    }
    else {
        const agent = AGENT_PROFILES.find((a) => a.id === agentId);
        systemPrompt = agent?.systemPrompt || "You are a helpful GRC assistant.";
    }
    const messages = [
        { role: "system", content: systemPrompt },
    ];
    if (opts?.tenantId) {
        try {
            const { buildRAGContext, formatRAGForPrompt } = await import('./rag-pipeline.service');
            const ragCtx = await buildRAGContext(opts.tenantId, agentId, userMessage, 3);
            const ragText = formatRAGForPrompt(ragCtx);
            if (ragText)
                messages.push({ role: "system", content: ragText });
        }
        catch { /* non-fatal */ }
    }
    if (context) {
        messages.push({ role: "system", content: `Context:\n${context}` });
    }
    messages.push({ role: "user", content: userMessage });
    return enhancedChatCompletion(messages, { agentId, ...opts, governedModelOverrides });
}
/**
 * Get agent profile by ID.
 */
export function getAgentProfile(agentId) {
    return AGENT_PROFILES.find((a) => a.id === agentId);
}
/**
 * Get all agent profiles.
 */
export function getAllAgentProfiles() {
    return AGENT_PROFILES;
}
//# sourceMappingURL=llm.service.js.map