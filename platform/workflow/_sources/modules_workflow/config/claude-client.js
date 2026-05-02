"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLAUDE_MODELS = exports.ClaudeTimeoutError = exports.ClaudeBudgetExceededError = exports.ClaudeApiError = void 0;
exports.getClaudeClient = getClaudeClient;
exports.callClaude = callClaude;
exports.claudeComplete = callClaude;
exports.callClaudeJSON = callClaudeJSON;
exports.claudeJSON = callClaudeJSON;
exports.resetClient = resetClient;
exports.loadAgentDef = loadAgentDef;
exports.buildToolResults = buildToolResults;
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
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const logger_port_1 = require("../ports/logger.port");
// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------
class ClaudeApiError extends Error {
    constructor(message, statusCode, retryable, tokenUsage) {
        super(message);
        this.statusCode = statusCode;
        this.retryable = retryable;
        this.tokenUsage = tokenUsage;
        this.name = 'ClaudeApiError';
    }
}
exports.ClaudeApiError = ClaudeApiError;
class ClaudeBudgetExceededError extends ClaudeApiError {
    constructor() {
        super('Token budget exceeded', 429, false);
        this.name = 'ClaudeBudgetExceededError';
    }
}
exports.ClaudeBudgetExceededError = ClaudeBudgetExceededError;
class ClaudeTimeoutError extends ClaudeApiError {
    constructor(timeoutMs) {
        super(`Request timed out after ${timeoutMs}ms`, 408, true);
        this.name = 'ClaudeTimeoutError';
    }
}
exports.ClaudeTimeoutError = ClaudeTimeoutError;
// ---------------------------------------------------------------------------
// Model versions — pinned, not "latest"
// ---------------------------------------------------------------------------
exports.CLAUDE_MODELS = {
    SONNET: 'claude-sonnet-4-20250514',
    HAIKU: 'claude-haiku-4-5-20251001',
    OPUS: 'claude-opus-4-20250514',
};
// ---------------------------------------------------------------------------
// Default config
// ---------------------------------------------------------------------------
const DEFAULT_TIMEOUT_MS = 120000;
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;
// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------
let clientInstance = null;
function getClaudeClient() {
    if (!clientInstance) {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
            throw new ClaudeApiError('ANTHROPIC_API_KEY not configured', 500, false);
        }
        clientInstance = new sdk_1.default({
            apiKey,
            timeout: DEFAULT_TIMEOUT_MS,
            maxRetries: 0, // we handle retries ourselves
        });
        logger_port_1.logger.info('[ClaudeClient] Initialized singleton');
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
            logger_port_1.logger.warn(`[ClaudeClient] ${opts.label || 'request'} failed (${status}), retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
            await new Promise(r => setTimeout(r, delay));
        }
    }
    throw lastError;
}
// ---------------------------------------------------------------------------
// Main API: create message with retry + timeout + tracking
// ---------------------------------------------------------------------------
async function callClaude(opts) {
    const client = getClaudeClient();
    const model = opts.model || exports.CLAUDE_MODELS.SONNET;
    const start = Date.now();
    const messages = opts.messages || [];
    if (opts.userMessage) {
        messages.push({ role: 'user', content: opts.userMessage });
    }
    const response = await withRetry(() => client.messages.create({
        model,
        max_tokens: opts.maxTokens || 4096,
        temperature: opts.temperature ?? 0.3,
        system: opts.systemPrompt || undefined,
        messages,
        tools: opts.tools,
    }), { label: `claude:${opts.agentId || 'direct'}`, maxRetries: 2 });
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
// ---------------------------------------------------------------------------
// JSON extraction helper (replaces old claudeJSON pattern)
// ---------------------------------------------------------------------------
async function callClaudeJSON(opts) {
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
function resetClient() {
    clientInstance = null;
}
function loadAgentDef(..._args) { return undefined; }
function buildToolResults(..._args) { return undefined; }
