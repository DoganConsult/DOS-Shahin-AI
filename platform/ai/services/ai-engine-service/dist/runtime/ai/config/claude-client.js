/**
 * Production-grade Claude API Client
 *
 * Features:
 * - Singleton pattern (one client per process)
 * - Retry with exponential backoff (429, 500, 529 errors)
 * - Model version pinning
 * - Timeout enforcement (120s default)
 * - Structured error types
 * - Cost tracking integration
 *
 * NOTE: The legacy client at `config/claude-client.ts` (project root)
 * remains the primary import for most services. This module provides
 * a hardened alternative for new AI-layer code.
 */
import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../ports/logger.port.js';
// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------
export class ClaudeApiError extends Error {
    statusCode;
    retryable;
    tokenUsage;
    constructor(message, statusCode, retryable, tokenUsage) {
        super(message);
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.tokenUsage = tokenUsage;
        this.name = 'ClaudeApiError';
    }
}
export class ClaudeBudgetExceededError extends ClaudeApiError {
    constructor() {
        super('Token budget exceeded', 429, false);
        this.name = 'ClaudeBudgetExceededError';
    }
}
export class ClaudeTimeoutError extends ClaudeApiError {
    constructor(timeoutMs) {
        super(`Request timed out after ${timeoutMs}ms`, 408, true);
        this.name = 'ClaudeTimeoutError';
    }
}
// ---------------------------------------------------------------------------
// Model versions — pinned, not "latest"
// ---------------------------------------------------------------------------
export const CLAUDE_MODELS = {
    SONNET: 'claude-sonnet-4-20250514',
    HAIKU: 'claude-haiku-4-5-20251001',
    OPUS: 'claude-opus-4-20250514',
};
// Singular aliases for backward compatibility with ai.port.ts re-exports
export const CLAUDE_MODEL = process.env.CLAUDE_MODEL || CLAUDE_MODELS.SONNET;
export const CLAUDE_MAX_TOKENS = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096', 10);
// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------
const DEFAULT_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let clientInstance = null;
export function getClaudeClient() {
    if (!clientInstance) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new ClaudeApiError('ANTHROPIC_API_KEY not configured', 500, false);
        }
        clientInstance = new Anthropic({
            apiKey,
            timeout: DEFAULT_TIMEOUT_MS,
            maxRetries: 0, // we handle retries ourselves
        });
        logger.info('[ClaudeClient] Initialized singleton');
    }
    return clientInstance;
}
// ---------------------------------------------------------------------------
// Retry logic
// ---------------------------------------------------------------------------
async function withRetry(fn, opts = {}) {
    const maxRetries = opts.maxRetries ?? MAX_RETRIES;
    let lastError;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            lastError = err;
            const status = err?.['status'];
            const retryable = status === 429 || status === 500 || status === 529 || status === 503;
            if (!retryable || attempt === maxRetries) {
                throw err;
            }
            const delay = RETRY_BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500;
            logger.warn(`[ClaudeClient] ${opts.label || 'request'} failed (${status}), retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
}
// ---------------------------------------------------------------------------
// Main API: create message with retry + timeout + tracking
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// LLM provider routing — selection priority (first match wins):
//   1. LLM_OFFLINE_MODE=1     → deterministic stub (no LLM call).
//   2. OPENROUTER_API_KEY set → OpenRouter (OpenAI-compatible). Default
//      model OPENROUTER_MODEL or 'anthropic/claude-sonnet-4-5'.
//   3. OLLAMA_BASE_URL set    → local Ollama (no key).
//   4. ANTHROPIC_API_KEY set  → Anthropic API direct.
//   5. None                   → warn + offline stub (no crash).
// ---------------------------------------------------------------------------
function offlineStub(opts, latencyMs, reason) {
    const model = opts.model || CLAUDE_MODELS.SONNET;
    const summary = opts.userMessage
        ? `[offline-stub] received: ${String(opts.userMessage).slice(0, 200)}`
        : '[offline-stub] no user message';
    logger.warn(`[ClaudeClient] ${reason}; returning offline stub for agent=${opts.agentId || 'direct'}`);
    return {
        content: summary,
        inputTokens: 0,
        outputTokens: 0,
        model,
        stopReason: 'end_turn',
        toolCalls: [],
        rawBlocks: [{ type: 'text', text: summary }],
        latencyMs,
    };
}
async function callOpenRouter(opts, apiKey) {
    const start = Date.now();
    const baseUrl = process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1';
    const model = opts.model || process.env.OPENROUTER_MODEL || 'anthropic/claude-sonnet-4-5';
    const messages = [];
    if (opts.systemPrompt)
        messages.push({ role: 'system', content: opts.systemPrompt });
    for (const m of opts.messages || []) {
        const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        messages.push({ role: m.role, content: c });
    }
    if (opts.userMessage)
        messages.push({ role: 'user', content: opts.userMessage });
    // Cap max_tokens to OPENROUTER_MAX_TOKENS (or 2048 default) to fit
    // tight prepaid-credit budgets — OpenRouter rejects with 402 if the
    // declared cap exceeds what the wallet can underwrite.
    const ceiling = parseInt(process.env.OPENROUTER_MAX_TOKENS || '2048', 10);
    const requestedMax = opts.maxTokens || CLAUDE_MAX_TOKENS;
    const max_tokens = Math.min(requestedMax, ceiling);
    const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
            // Optional ranking attribution — only set if the operator has opted
            // in via env so we don't leak hostnames by default.
            ...(process.env.OPENROUTER_REFERER ? { 'HTTP-Referer': process.env.OPENROUTER_REFERER } : {}),
            ...(process.env.OPENROUTER_TITLE ? { 'X-OpenRouter-Title': process.env.OPENROUTER_TITLE } : {}),
        },
        body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.3,
            max_tokens,
        }),
    });
    if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new ClaudeApiError(`OpenRouter returned ${res.status}: ${body.slice(0, 200)}`, res.status, res.status >= 500 || res.status === 429);
    }
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content ?? '';
    return {
        content,
        inputTokens: j?.usage?.prompt_tokens ?? 0,
        outputTokens: j?.usage?.completion_tokens ?? 0,
        model: j?.model || model,
        stopReason: j?.choices?.[0]?.finish_reason || 'end_turn',
        toolCalls: [],
        rawBlocks: [{ type: 'text', text: content }],
        latencyMs: Date.now() - start,
    };
}
async function callOllama(opts, baseUrl) {
    const start = Date.now();
    const model = opts.model || process.env.OLLAMA_MODEL || 'llama3.1:8b';
    const messages = [];
    if (opts.systemPrompt)
        messages.push({ role: 'system', content: opts.systemPrompt });
    for (const m of opts.messages || []) {
        const c = typeof m.content === 'string' ? m.content : JSON.stringify(m.content);
        messages.push({ role: m.role, content: c });
    }
    if (opts.userMessage)
        messages.push({ role: 'user', content: opts.userMessage });
    const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;
    const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            model,
            messages,
            temperature: opts.temperature ?? 0.3,
            max_tokens: opts.maxTokens || 4096,
        }),
    });
    if (!res.ok) {
        throw new ClaudeApiError(`Ollama returned ${res.status}`, res.status, res.status >= 500);
    }
    const j = await res.json();
    const content = j?.choices?.[0]?.message?.content ?? '';
    return {
        content,
        inputTokens: j?.usage?.prompt_tokens ?? 0,
        outputTokens: j?.usage?.completion_tokens ?? 0,
        model: j?.model || model,
        stopReason: j?.choices?.[0]?.finish_reason || 'end_turn',
        toolCalls: [],
        rawBlocks: [{ type: 'text', text: content }],
        latencyMs: Date.now() - start,
    };
}
const _llmBreaker = {
    state: 'closed',
    failures: [],
    openedAt: 0,
    windowMs: 60_000,
    threshold: 5,
    cooldownMs: 30_000,
};
function _llmBreakerCheck() {
    const now = Date.now();
    _llmBreaker.failures = _llmBreaker.failures.filter(t => now - t < _llmBreaker.windowMs);
    if (_llmBreaker.state === 'open') {
        if (now - _llmBreaker.openedAt >= _llmBreaker.cooldownMs) {
            _llmBreaker.state = 'half_open';
            logger.warn('[ClaudeClient] circuit half-open — allowing one trial call');
            return { allow: true };
        }
        return { allow: false, reason: `circuit-open (${Math.round((_llmBreaker.cooldownMs - (now - _llmBreaker.openedAt)) / 1000)}s cooldown remaining)` };
    }
    return { allow: true };
}
function _llmBreakerSuccess() {
    if (_llmBreaker.state !== 'closed')
        logger.info(`[ClaudeClient] circuit closed (recovered from ${_llmBreaker.state})`);
    _llmBreaker.state = 'closed';
    _llmBreaker.failures = [];
    _llmBreaker.openedAt = 0;
}
function _llmBreakerFailure() {
    const now = Date.now();
    _llmBreaker.failures.push(now);
    _llmBreaker.failures = _llmBreaker.failures.filter(t => now - t < _llmBreaker.windowMs);
    if (_llmBreaker.state === 'half_open' || _llmBreaker.failures.length >= _llmBreaker.threshold) {
        _llmBreaker.state = 'open';
        _llmBreaker.openedAt = now;
        logger.error(`[ClaudeClient] circuit OPEN — ${_llmBreaker.failures.length} fails in ${_llmBreaker.windowMs / 1000}s; cooldown=${_llmBreaker.cooldownMs / 1000}s`);
    }
}
export function getLlmCircuitBreakerState() {
    const now = Date.now();
    return {
        state: _llmBreaker.state,
        recentFailures: _llmBreaker.failures.filter(t => now - t < _llmBreaker.windowMs).length,
        openedAt: _llmBreaker.openedAt || null,
    };
}
async function _callClaudeInner(opts) {
    const start = Date.now();
    if (process.env.LLM_OFFLINE_MODE === '1' || process.env.LLM_OFFLINE_MODE === 'true') {
        return offlineStub(opts, Date.now() - start, 'LLM_OFFLINE_MODE=1');
    }
    // Wave 5.3 — circuit breaker gate. Don't even attempt provider call when open.
    const gate = _llmBreakerCheck();
    if (!gate.allow) {
        return offlineStub(opts, Date.now() - start, `LLM circuit breaker: ${gate.reason}`);
    }
    let providerError = null;
    const openRouterKey = process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
        try {
            const r = await callOpenRouter(opts, openRouterKey);
            _llmBreakerSuccess();
            return r;
        }
        catch (err) {
            providerError = err;
            logger.warn(`[ClaudeClient] OpenRouter call failed (${providerError.message}); falling through`);
        }
    }
    const ollamaUrl = process.env.OLLAMA_BASE_URL;
    if (ollamaUrl) {
        try {
            const r = await callOllama(opts, ollamaUrl);
            _llmBreakerSuccess();
            return r;
        }
        catch (err) {
            providerError = err;
            logger.warn(`[ClaudeClient] Ollama call failed (${providerError.message}); falling through`);
        }
    }
    if (!process.env.ANTHROPIC_API_KEY) {
        // Config gap — do NOT trip the breaker (this isn't a provider failure).
        return offlineStub(opts, Date.now() - start, 'no LLM provider configured (OPENROUTER_API_KEY/OLLAMA_BASE_URL/ANTHROPIC_API_KEY/LLM_OFFLINE_MODE all unset)');
    }
    // If a provider was configured AND failed, count it before falling through to Anthropic direct.
    if (providerError)
        _llmBreakerFailure();
    const client = getClaudeClient();
    const model = opts.model || CLAUDE_MODELS.SONNET;
    const messages = opts.messages || [];
    if (opts.userMessage) {
        messages.push({ role: 'user', content: opts.userMessage });
    }
    let response;
    try {
        response = await withRetry(() => client.messages.create({
            model,
            max_tokens: opts.maxTokens || 4096,
            temperature: opts.temperature ?? 0.3,
            system: opts.systemPrompt || undefined,
            messages,
            tools: opts.tools,
        }), { label: `claude:${opts.agentId || 'direct'}`, maxRetries: 2 });
        _llmBreakerSuccess();
    }
    catch (err) {
        _llmBreakerFailure();
        throw err;
    }
    const latencyMs = Date.now() - start;
    const content = response.content
        .filter((block) => block.type === 'text')
        .map(block => block.text)
        .join('');
    const toolCalls = response.content
        .filter((block) => block.type === 'tool_use')
        .map(block => ({
        id: block.id,
        name: block.name,
        input: block.input,
    }));
    return {
        content,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        model: response.model,
        stopReason: response.stop_reason,
        toolCalls,
        rawBlocks: response.content,
        latencyMs,
    };
}
// Public entrypoint: wraps _callClaudeInner with LangSmith tracing so
// every LLM round-trip (any provider) lands in the configured project.
// Tracing is best-effort and never blocks or fails the call.
export async function callClaude(opts) {
    const startedAt = Date.now();
    let result;
    let errorMsg;
    try {
        result = await _callClaudeInner(opts);
        return result;
    }
    catch (err) {
        errorMsg = err.message;
        throw err;
    }
    finally {
        try {
            const { recordLlmRun } = await import('../observability/langsmith-bridge.js');
            await recordLlmRun({
                agentId: opts.agentId,
                model: result?.model || opts.model || 'unknown',
                systemPrompt: opts.systemPrompt,
                userMessage: opts.userMessage,
                inputTokens: result?.inputTokens ?? 0,
                outputTokens: result?.outputTokens ?? 0,
                content: result?.content ?? '',
                stopReason: result?.stopReason ?? null,
                startedAt,
                endedAt: Date.now(),
                error: errorMsg,
                tags: opts.tenantId ? [`tenant:${opts.tenantId}`] : undefined,
            });
        }
        catch { /* best-effort tracing */ }
        // Persist per-call cost+tokens to <tenant>.llm_usage_log so the
        // /dashboard totalCostUsd, budget cap enforcement, and per-agent cost
        // breakdown all see real numbers. The tenant_llm_budgets monthly
        // counter is updated in the same trackUsage call. Best-effort: never
        // blocks or fails the LLM round-trip.
        if (opts.tenantId) {
            try {
                const { trackUsage } = await import('../services/gateway/llm-usage-tracker.service.js');
                const inferredProvider = result?.model?.toLowerCase().includes('claude')
                    ? (process.env.OPENROUTER_API_KEY ? 'openrouter' : 'anthropic')
                    : (process.env.OLLAMA_BASE_URL ? 'ollama' : 'unknown');
                await trackUsage({
                    tenantId: opts.tenantId,
                    agentId: opts.agentId,
                    provider: inferredProvider,
                    model: result?.model || opts.model || 'unknown',
                    inputTokens: result?.inputTokens ?? 0,
                    outputTokens: result?.outputTokens ?? 0,
                    latencyMs: Date.now() - startedAt,
                    error: errorMsg,
                });
            }
            catch { /* best-effort */ }
        }
        // Wave 1 G1 — DO NOT score callClaude output against
        // dataset.<agent>.smoke. The dataset items expect agent-contract
        // shapes ({status, agentCode}) but raw LLM content is free-form
        // text — every score would be 0. Scoring is done one layer up in
        // agent-runner.service.ts on the structured AgentRunResult.
    }
}
// ---------------------------------------------------------------------------
// JSON extraction helper (replaces old claudeJSON pattern)
// ---------------------------------------------------------------------------
export async function callClaudeJSON(opts) {
    const response = await callClaude(opts);
    try {
        // Extract JSON from markdown code blocks if present
        let jsonStr = response.content;
        const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch)
            jsonStr = codeBlockMatch[1].trim();
        return JSON.parse(jsonStr);
    }
    catch {
        throw new ClaudeApiError(`Failed to parse JSON response: ${response.content.slice(0, 200)}`, 422, false, { input: response.inputTokens, output: response.outputTokens });
    }
}
// ---------------------------------------------------------------------------
// Reset for testing
// ---------------------------------------------------------------------------
export function resetClient() {
    clientInstance = null;
}
const AGENT_DEFS = {
    A01: {
        id: 'A01',
        name: 'Onboarding Agent',
        systemPrompt: 'You are A01 (Onboarding Agent) in a multi-tenant GRC platform. Your job is to validate onboarding inputs, infer needed setup, and propose safe next steps. Use tools to fetch facts; never guess tenant data. Prefer read-only actions; propose write actions with clear justification and risk.',
        knowledge: ['tenant onboarding', 'workspace readiness', 'regulatory scoping', 'foundation module'],
        guardrails: ['Never expose secrets.', 'Never access data outside the tenant.', 'If data is missing, request it or use tools.', 'Return structured, actionable output.'],
    },
    A02: {
        id: 'A02',
        name: 'Identity Provisioning Agent',
        systemPrompt: 'You are A02 (Identity Provisioning Agent). You focus on identity, RBAC, least privilege, and provisioning hygiene. Detect over-privilege, missing role assignments, and risky access patterns. Propose changes with auditability and separation-of-duties.',
        knowledge: ['users', 'roles', 'permissions', 'access reviews', 'least privilege'],
        guardrails: ['Never create privileged access without explicit approval.', 'No platform-admin bypass for tenant users.', 'Explain impact and rollback for any write.'],
    },
    A03: {
        id: 'A03',
        name: 'Framework Mapping Agent',
        systemPrompt: 'You are A03 (Framework Mapping Agent). You map frameworks and controls, identify coverage gaps, and recommend mappings. Use DB facts and tool outputs; avoid speculative mappings. Prefer incremental, reviewable mapping proposals.',
        knowledge: ['frameworks', 'control mapping', 'coverage analysis'],
    },
    A04: {
        id: 'A04',
        name: 'Control Authoring Agent',
        systemPrompt: 'You are A04 (Control Authoring Agent). You draft control documentation and implementation guidance aligned to selected frameworks. Produce practical, audit-ready content. If referencing regulations, keep it tenant-scoped and grounded in stored framework data.',
        knowledge: ['controls', 'procedures', 'policy drafting', 'implementation guidance'],
    },
    A05: {
        id: 'A05',
        name: 'Evidence Collection Agent',
        systemPrompt: 'You are A05 (Evidence Collection Agent). You identify missing/expired evidence, suggest sources, and propose collection tasks. Use evidence tooling; avoid claiming evidence exists unless verified.',
        knowledge: ['evidence', 'artifacts', 'freshness checks', 'collection workflows'],
    },
    A06: {
        id: 'A06',
        name: 'Gap Remediation Agent',
        systemPrompt: 'You are A06 (Gap Remediation Agent). You analyze compliance gaps and propose remediation roadmaps with prioritized tasks, owners, and dependencies. Keep recommendations realistic and tied to actual gaps found in data.',
        knowledge: ['gap analysis', 'remediation planning', 'roadmaps', 'prioritization'],
    },
    A07: {
        id: 'A07',
        name: 'Risk Register Agent',
        systemPrompt: 'You are A07 (Risk Register Agent). You identify and score risks, check appetite breaches, and propose treatment options. Use tenant risk data and scoring rules; do not invent risk facts.',
        knowledge: ['risk scoring', 'risk appetite', 'treatments', 'KRIs'],
    },
    A08: {
        id: 'A08',
        name: 'Policy Lifecycle Agent',
        systemPrompt: 'You are A08 (Policy Lifecycle Agent). You manage policy lifecycle signals (review due, violations, expiry), propose review workflows, and assess regulatory change impact. Keep actions auditable and approval-aware.',
        knowledge: ['policy lifecycle', 'approvals', 'review cycles', 'regulatory impact'],
    },
    A09: {
        id: 'A09',
        name: 'Third-Party Risk Agent',
        systemPrompt: 'You are A09 (Third-Party Risk Agent). You assess vendor risk, monitor third-party posture, and propose remediation or escalation. Base conclusions on vendor records and evidence; do not infer without data.',
        knowledge: ['vendor risk', 'TPRM', 'assessments', 'supply chain'],
    },
    A10: {
        id: 'A10',
        name: 'Audit Reporting Agent',
        systemPrompt: 'You are A10 (Audit Reporting Agent). You prepare audit-ready summaries, track findings, and generate reporting narratives grounded in tenant data. Avoid placeholders; if data is missing, list requirements explicitly.',
        knowledge: ['audit readiness', 'findings', 'reporting', 'executive summaries'],
    },
    A11: {
        id: 'A11',
        name: 'BCP Continuity Agent',
        systemPrompt: 'You are A11 (BCP Continuity Agent). You monitor BCP readiness, exercises, and RTO/RPO drift. Recommend actions and create tasks when warranted.',
        knowledge: ['BCP plans', 'BIA', 'exercises', 'RTO/RPO'],
    },
    A12: {
        id: 'A12',
        name: 'Security Awareness & Training Agent',
        systemPrompt: 'You are A12 (Security Awareness & Training Agent). You track training completion, identify gaps, and recommend programs/campaigns. Keep recommendations scoped to tenant training data.',
        knowledge: ['training programs', 'campaigns', 'completion tracking', 'skill gaps'],
    },
    A13: {
        id: 'A13',
        name: 'Policy Review & Landing Copilot',
        systemPrompt: 'You are A13 (Policy Review & Landing Copilot). You operate in two surfaces: (1) tenant policy review — analyze policy drift, expiration, and gap patterns; (2) public landing copilot — answer top-of-funnel questions about the platform, classify visitor intent (demo/contact/pricing/docs/general), and capture leads when intent is non-general. Never expose tenant data on the public surface; never invent policies on the tenant surface.',
        knowledge: ['policy review cycles', 'policy drift', 'landing-page intents', 'lead capture'],
        guardrails: ['Public landing surface MUST NOT access tenant data.', 'Lead capture writes are restricted to copilot_leads.', 'When unsure of intent, default to general and offer documentation links.'],
    },
};
export function loadAgentDef(agentId) {
    const key = String(agentId || '').trim();
    return AGENT_DEFS[key] ?? null;
}
export function buildToolResults(results) {
    return (results || []).map((r) => {
        const toolUseId = String(r.tool_use_id ?? r.toolCallId ?? '');
        const content = r.content !== undefined
            ? String(r.content)
            : typeof r.output === 'string'
                ? r.output
                : JSON.stringify(r.output ?? null);
        const isError = Boolean(r.is_error ?? r.isError ?? false);
        return {
            type: 'tool_result',
            tool_use_id: toolUseId,
            content,
            is_error: isError,
        };
    });
}
//# sourceMappingURL=claude-client.js.map